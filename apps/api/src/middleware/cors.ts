// apps/api/src/middleware/cors.ts
import cors from 'cors';
import { config } from '../config';

export const corsMiddleware = cors({
  origin: config.frontendUrl,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Secret'],
  credentials: true,
});
