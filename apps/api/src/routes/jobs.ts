// apps/api/src/routes/jobs.ts
import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { fileExists } from '../services/fileStorage';
import { NotFoundError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = await prisma.job.findUnique({
      where: { id: req.params['id'] },
    });

    if (!job) {
      throw new NotFoundError(`Job ${req.params['id']} not found`);
    }

    const downloadReady =
      job.status === 'COMPLETE' &&
      job.outputPath !== null &&
      fileExists(job.outputPath);

    res.status(200).json({
      id: job.id,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      status: job.status,
      manuscriptPath: job.manuscriptPath,
      journalSpecPath: job.journalSpecPath,
      outputPath: job.outputPath,
      errorMessage: job.errorMessage,
      complianceReport: job.complianceReport,
      processingStartedAt: job.processingStartedAt,
      processingCompletedAt: job.processingCompletedAt,
      downloadReady,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
