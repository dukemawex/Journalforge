// apps/api/src/routes/download.ts
import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { NotFoundError, JobNotCompleteError } from '../middleware/errorHandler';
import { downloadFromSpaces } from '../services/fileStorage';

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

    const buffer = await downloadFromSpaces(job.outputPath);

    res.setHeader('Content-Disposition', 'attachment; filename="formatted-manuscript.docx"');
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

export default router;
