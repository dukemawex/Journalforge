// apps/api/src/index.ts
import express from 'express';
import { config } from './config';
import { corsMiddleware } from './middleware/cors';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { ensureStorageDir } from './services/fileStorage';
import { startWorker } from './services/jobQueue';
import healthRouter from './routes/health';
import uploadRouter from './routes/upload';
import jobsRouter from './routes/jobs';
import downloadRouter from './routes/download';

const app = express();

// Global middleware
app.use(corsMiddleware);
// Explicitly handle preflight OPTIONS for every route so they never reach authMiddleware
app.options('*', corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Public route — no auth required
app.use('/health', healthRouter);

// Protected routes
app.use('/upload', authMiddleware, uploadRouter);
app.use('/jobs', authMiddleware, jobsRouter);
app.use('/download', authMiddleware, downloadRouter);

// Error handler (must be last)
app.use(errorHandler);

// Bootstrap
ensureStorageDir();
startWorker();

app.listen(config.port, () => {
  console.log(
    `JournalForge API listening on port ${config.port} [${config.nodeEnv}]`
  );
});

export default app;
