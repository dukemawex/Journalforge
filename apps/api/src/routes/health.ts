// apps/api/src/routes/health.ts
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import { config } from '../config';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (_req: Request, res: Response) => {
  let dbStatus = false;
  let redisStatus = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = true;
  } catch {
    dbStatus = false;
  }

  try {
    const client = createClient({ url: config.redisUrl });
    await client.connect();
    await client.ping();
    await client.disconnect();
    redisStatus = true;
  } catch {
    redisStatus = false;
  }

  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    version: process.env['npm_package_version'] ?? '1.0.0',
    db: dbStatus ? 'connected' : 'disconnected',
    redis: redisStatus ? 'connected' : 'disconnected',
  });
});

export default router;
