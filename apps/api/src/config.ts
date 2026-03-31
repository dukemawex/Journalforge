// apps/api/src/config.ts
import dotenv from 'dotenv';

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: parseInt(process.env['PORT'] ?? '8080', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  databaseUrl: requireEnv('DATABASE_URL'),
  redisUrl: requireEnv('REDIS_URL'),
  openrouterApiKey: requireEnv('OPENROUTER_API_KEY'),
  frontendUrl: requireEnv('FRONTEND_URL'),
  storagePath: process.env['STORAGE_PATH'] ?? '/tmp/journalforge',
  spacesKey: requireEnv('DO_SPACES_KEY'),
  spacesSecret: requireEnv('DO_SPACES_SECRET'),
  spacesBucket: requireEnv('DO_SPACES_BUCKET'),
  spacesRegion: process.env['DO_SPACES_REGION'] ?? 'nyc3',
  spacesEndpoint: requireEnv('DO_SPACES_ENDPOINT'),
  apiSecret: requireEnv('API_SECRET'),
  openrouterBaseUrl: 'https://openrouter.ai/api/v1/chat/completions',
  aiModel: 'anthropic/claude-sonnet-4.6',
  maxFileSize: {
    manuscript: 20 * 1024 * 1024,
    journalSpec: 10 * 1024 * 1024,
  },
};
