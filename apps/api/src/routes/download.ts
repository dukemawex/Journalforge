// apps/api/src/routes/download.ts
import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { NotFoundError, JobNotCompleteError } from '../middleware/errorHandler';

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

    if (job.status !== 'COMPLETE' || !job.outputPath) {
      throw new JobNotCompleteError(
        `Job ${job.id} is not complete. Current status: ${job.status}`
      );
    }

    if (!fs.existsSync(job.outputPath)) {
      throw new NotFoundError(`Output file for job ${job.id} not found on disk`);
    }

    const filename = `journalforge-${job.id}.docx`;
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.setHeader('Content-Length', fs.statSync(job.outputPath).size);

    const fileStream = fs.createReadStream(job.outputPath);
    fileStream.pipe(res);
  } catch (err) {
    next(err);
  }
});

export default router;
