// apps/api/src/routes/upload.ts
import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { manuscriptQueue } from '../services/jobQueue';
import { ensureStorageDir } from '../services/fileStorage';
import { FileTypeError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

const ALLOWED_EXTENSIONS = ['.docx', '.pdf'];
const ALLOWED_MIMETYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/pdf',
];

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
): void {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.includes(ext) && ALLOWED_MIMETYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new FileTypeError(`File type not allowed: ${file.mimetype}. Only DOCX and PDF are accepted.`));
  }
}

ensureStorageDir();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureStorageDir();
    cb(null, config.storagePath);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    cb(null, `${timestamp}-${random}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxFileSize.manuscript,
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

      const job = await prisma.job.create({
        data: {
          status: 'PENDING',
          manuscriptPath: manuscriptFile.path,
          journalSpecPath: journalSpecFile.path,
        },
      });

      await manuscriptQueue.add('process', { jobId: job.id }, { jobId: job.id });

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
