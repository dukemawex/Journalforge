// apps/api/src/middleware/cors.ts
import cors from 'cors';
import { config } from '../config';

export const corsMiddleware = cors({
  allowedHeaders: [
    'Content-Type',
    'X-API-Secret',
    'Authorization',
  ],
  exposedHeaders: ['Content-Disposition'],
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
  origin: config.frontendUrl,
});
