import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { manuscriptQueue } from '../services/jobQueue';
import { generateSpacesKey, uploadToSpaces } from '../services/fileStorage';
import { FileTypeError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

const ALLOWED_EXTENSIONS = ['.docx', '.pdf'];

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new FileTypeError(`File type not allowed: ${file.mimetype}. Only DOCX and PDF are accepted.`));
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024,
  },
});

router.post(
  '/',
  upload.fields([
    { name: 'manuscript', maxCount: 1 },
    { name: 'journalSpec', maxCount: 1 },
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = req.files as Record<string, Express.Multer.File[]> | undefined;

      if (!files?.['manuscript']?.[0] || !files?.['journalSpec']?.[0]) {
        res.status(400).json({
          error: 'Both manuscript and journalSpec files are required',
          code: 'MISSING_FILES',
        });
        return;
      }

      const manuscriptFile = files['manuscript'][0];
      const journalSpecFile = files['journalSpec'][0];

      if (journalSpecFile.size > config.maxFileSize.journalSpec) {
        res.status(400).json({
          error: `Journal spec file too large. Maximum size is ${config.maxFileSize.journalSpec / 1024 / 1024}MB`,
          code: 'FILE_TOO_LARGE',
        });
        return;
      }

      const jobId = randomUUID();
      const manuscriptExt = path.extname(manuscriptFile.originalname).toLowerCase();
      const specExt = path.extname(journalSpecFile.originalname).toLowerCase();

      const manuscriptKey = generateSpacesKey(jobId, `manuscript${manuscriptExt}`);
      const specKey = generateSpacesKey(jobId, `journal-spec${specExt}`);

      await uploadToSpaces(manuscriptKey, manuscriptFile.buffer, manuscriptFile.mimetype);
      await uploadToSpaces(specKey, journalSpecFile.buffer, journalSpecFile.mimetype);

      const job = await prisma.job.create({
        data: {
          id: jobId,
          status: 'PENDING',
          manuscriptPath: manuscriptKey,
          journalSpecPath: specKey,
        },
      });

      await manuscriptQueue.add(
        'process',
        {
          jobId: job.id,
          manuscriptKey,
          manuscriptName: manuscriptFile.originalname,
          specKey,
          specName: journalSpecFile.originalname,
        },
        { jobId: job.id }
      );

      res.status(201).json({
        jobId: job.id,
        pollingUrl: `/jobs/${job.id}`,
        status: job.status,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
