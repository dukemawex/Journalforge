// apps/api/src/services/docxBuilder.ts
import { spawn, spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { AssemblyActionList } from '../types';
import { AIPipelineError as PipelineError } from '../middleware/errorHandler';

const PYTHON_SCRIPT = path.join(__dirname, '..', 'scripts', 'build_docx.py');

export async function buildDocx(
  _jobId: string,
  actions: AssemblyActionList
): Promise<Buffer> {
  const checkResult = spawnSync('python3', [
    '-c', 'from docx import Document'
  ]);
  if (checkResult.status !== 0) {
    throw new PipelineError(
      'python-docx is not installed in this environment. ' +
      'Rebuild the Docker image to fix this.'
    );
  }

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
          new PipelineError(
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
      reject(new PipelineError(`Failed to spawn build_docx.py: ${err.message}`));
    });

    try {
      child.stdin.write(JSON.stringify(actions));
      child.stdin.end();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      reject(new PipelineError(`Failed to send actions to build_docx.py: ${message}`));
    }
  });
}
