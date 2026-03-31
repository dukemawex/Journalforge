// apps/api/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const secret = req.headers['x-api-secret'];
  if (!secret || secret !== config.apiSecret) {
    res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
    return;
  }
  next();
}
