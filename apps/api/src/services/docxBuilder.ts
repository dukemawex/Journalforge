// apps/api/src/services/docxBuilder.ts
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { AssemblyActionList } from '../types';

const PYTHON_SCRIPT = path.join(__dirname, '..', 'scripts', 'build_docx.py');

export async function buildDocx(
  jobId: string,
  actions: AssemblyActionList
): Promise<string> {
  const actionsPath = path.join(config.storagePath, `${jobId}-actions.json`);
  const outputPath = path.join(config.storagePath, `${jobId}-output.docx`);

  fs.writeFileSync(actionsPath, JSON.stringify(actions, null, 2), 'utf8');

  return new Promise((resolve, reject) => {
    const scriptPath = fs.existsSync(PYTHON_SCRIPT)
      ? PYTHON_SCRIPT
      : path.join(process.cwd(), 'src', 'scripts', 'build_docx.py');

    const child = spawn('python3', [scriptPath, actionsPath, outputPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      // Clean up actions temp file
      try {
        fs.unlinkSync(actionsPath);
      } catch {
        // ignore cleanup errors
      }

      if (code !== 0) {
        reject(
          new Error(
            `build_docx.py exited with code ${code}. stderr: ${stderr.trim()}`
          )
        );
        return;
      }

      if (!fs.existsSync(outputPath)) {
        reject(new Error('build_docx.py completed but output file was not created'));
        return;
      }

      console.log(`DOCX built successfully: ${stdout.trim()}`);
      resolve(outputPath);
    });

    child.on('error', (err) => {
      reject(new Error(`Failed to spawn build_docx.py: ${err.message}`));
    });
  });
}
