// apps/api/src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class FileTypeError extends AppError {
  constructor(message: string) {
    super(message, 'INVALID_FILE_TYPE', 415);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 'NOT_FOUND', 404);
  }
}

export class JobNotCompleteError extends AppError {
  constructor(message: string) {
    super(message, 'JOB_NOT_COMPLETE', 409);
  }
}

export class AIPipelineError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'AI_PIPELINE_FAILURE', 502, details);
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation error',
      code: 'VALIDATION_ERROR',
      details: err.errors,
    });
    return;
  }

  if (err instanceof AppError) {
    const body: Record<string, unknown> = {
      error: err.message,
      code: err.code,
    };
    if (err.details !== undefined) {
      body['details'] = err.details;
    }
    res.status(err.statusCode).json(body);
    return;
  }

  const message = err instanceof Error ? err.message : 'Internal server error';
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: message,
    code: 'INTERNAL_SERVER_ERROR',
  });
}
