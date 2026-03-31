import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { config } from '../config';

const s3 = new S3Client({
  endpoint: config.spacesEndpoint,
  region: config.spacesRegion,
  credentials: {
    accessKeyId: config.spacesKey,
    secretAccessKey: config.spacesSecret,
  },
  forcePathStyle: false,
});

export async function uploadToSpaces(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: config.spacesBucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: 'private',
      })
    );
    return key;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to upload file to Spaces (${key}): ${message}`);
  }
}

export async function downloadFromSpaces(key: string): Promise<Buffer> {
  try {
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: config.spacesBucket,
        Key: key,
      })
    );

    if (!response.Body) {
      throw new Error('Empty response body from Spaces');
    }

    const stream = response.Body as Readable;
    return await new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer | string) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to download file from Spaces (${key}): ${message}`);
  }
}

export async function deleteFromSpaces(key: string): Promise<void> {
  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: config.spacesBucket,
        Key: key,
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to delete file from Spaces (${key}): ${message}`);
  }
}

export function generateSpacesKey(jobId: string, suffix: string): string {
  return `jobs/${jobId}/${suffix}`;
}

export function ensureStorageDir(): void {
  // Intentionally no-op for Spaces-based storage.
}
