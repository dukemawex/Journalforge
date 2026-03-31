// apps/api/src/services/fileStorage.ts
import fs from 'fs';
import path from 'path';
import { config } from '../config';

export function ensureStorageDir(): void {
  if (!fs.existsSync(config.storagePath)) {
    fs.mkdirSync(config.storagePath, { recursive: true });
  }
}

export function getFilePath(filename: string): string {
  return path.join(config.storagePath, filename);
}

export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

export function deleteFile(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
