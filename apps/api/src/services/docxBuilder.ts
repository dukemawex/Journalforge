// apps/api/src/services/docxBuilder.ts
import { spawn, spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { AssemblyActionList } from '../types';

const PYTHON_SCRIPT = path.join(__dirname, '..', 'scripts', 'build_docx.py');
let pythonDocxChecked = false;

function ensurePythonDocxAvailable(): void {
  if (pythonDocxChecked) return;

  const check = spawnSync('python3', ['-c', 'import docx'], {
    encoding: 'utf8',
  });
  if (check.status === 0) {
    pythonDocxChecked = true;
    return;
  }

  const install = spawnSync('python3', ['-m', 'pip', 'install', '--user', 'python-docx', 'lxml'], {
    encoding: 'utf8',
  });
  if (install.status !== 0) {
    const details = install.stderr?.trim() || check.stderr?.trim() || 'unknown error';
    throw new Error(
      `Python dependency python-docx is required to build DOCX files. Failed to install automatically: ${details}`
    );
  }

  pythonDocxChecked = true;
}

export async function buildDocx(
  _jobId: string,
  actions: AssemblyActionList
): Promise<Buffer> {
  ensurePythonDocxAvailable();

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
