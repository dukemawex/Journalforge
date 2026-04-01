// apps/api/src/services/docxBuilder.ts
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { AssemblyActionList } from '../types';

const PYTHON_SCRIPT = path.join(__dirname, '..', 'scripts', 'build_docx.py');
let pythonDocxChecked = false;
let pythonDocxCheckPromise: Promise<void> | null = null;

function runPython(command: string[]): Promise<{ code: number | null; stderr: string }> {
  return new Promise((resolve) => {
    const proc = spawn('python3', command, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      resolve({ code, stderr });
    });

    proc.on('error', (err) => {
      resolve({ code: 1, stderr: err.message });
    });
  });
}

async function ensurePythonDocxAvailable(): Promise<void> {
  if (pythonDocxChecked) return;
  if (pythonDocxCheckPromise) return pythonDocxCheckPromise;

  pythonDocxCheckPromise = (async () => {
    const check = await runPython(['-c', 'import docx']);
    if (check.code === 0) {
      pythonDocxChecked = true;
      return;
    }

    const install = await runPython([
      '-m',
      'pip',
      'install',
      '--user',
      '--disable-pip-version-check',
      '--no-input',
      'python-docx',
      'lxml',
    ]);

    if (install.code !== 0) {
      const details = install.stderr.trim() || check.stderr.trim() || 'unknown error';
      throw new Error(
        `Python dependency python-docx is required to build DOCX files. Failed to install automatically: ${details}`
      );
    }

    pythonDocxChecked = true;
  })();

  try {
    await pythonDocxCheckPromise;
  } finally {
    pythonDocxCheckPromise = null;
  }
}

export async function buildDocx(
  _jobId: string,
  actions: AssemblyActionList
): Promise<Buffer> {
  await ensurePythonDocxAvailable();

  return new Promise((resolve, reject) => {
    const scriptPath = fs.existsSync(PYTHON_SCRIPT)
      ? PYTHON_SCRIPT
      : path.join(process.cwd(), 'src', 'scripts', 'build_docx.py');

    const child = spawn('python3', [scriptPath, '-', '-'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const stdoutChunks: Buffer[] = [];
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => {
      stdoutChunks.push(data);
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `build_docx.py exited with code ${code}. stderr: ${stderr.trim()}`
          )
        );
        return;
      }

      const outputBuffer = Buffer.concat(stdoutChunks);
      if (outputBuffer.length === 0) {
        reject(new Error('build_docx.py completed but no DOCX data was returned'));
        return;
      }

      resolve(outputBuffer);
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to spawn build_docx.py: ${err.message}`));
    });

    try {
      child.stdin.write(JSON.stringify(actions));
      child.stdin.end();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      reject(new Error(`Failed to send actions to build_docx.py: ${message}`));
    }
  });
}
