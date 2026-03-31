// apps/api/src/services/jobQueue.ts
import { Queue, Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { parseDocument } from './documentParser';
import { runParserStage, runFormatterStage, runAssemblerStage } from './aiPipeline';
import { buildDocx } from './docxBuilder';
import { generateSpacesKey, uploadToSpaces } from './fileStorage';

interface ProcessJobData {
  jobId: string;
  manuscriptKey: string;
  manuscriptName: string;
  specKey: string;
  specName: string;
}

function inferMimeType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (lower.endsWith('.pdf')) {
    return 'application/pdf';
  }
  throw new Error(`Unsupported file extension for ${filename}`);
}

const prisma = new PrismaClient();

const connection = {
  url: config.redisUrl,
};

export const manuscriptQueue = new Queue('manuscript-processing', {
  connection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: 100,
    removeOnFail: 100,
  },
});

export function startWorker(): void {
  const worker = new Worker<ProcessJobData>(
    'manuscript-processing',
    async (job: Job<ProcessJobData>) => {
      const { jobId, manuscriptKey, manuscriptName, specKey, specName } = job.data;

      const dbJob = await prisma.job.findUnique({ where: { id: jobId } });
      if (!dbJob) {
        throw new Error(`Job ${jobId} not found in database`);
      }

      try {
        // Stage: PARSING
        await prisma.job.update({
          where: { id: jobId },
          data: {
            status: 'PARSING',
            processingStartedAt: new Date(),
          },
        });

        const [manuscriptContent, journalSpecContent] = await Promise.all([
          parseDocument(manuscriptKey, inferMimeType(manuscriptName)),
          parseDocument(specKey, inferMimeType(specName)),
        ]);

        // Stage: FORMATTING
        await prisma.job.update({
          where: { id: jobId },
          data: { status: 'FORMATTING' },
        });

        const parsedDocument = await runParserStage(manuscriptContent);
        const formattedDocument = await runFormatterStage(parsedDocument, journalSpecContent);

        await prisma.job.update({
          where: { id: jobId },
          data: {
            complianceReport: formattedDocument.compliance_report as object,
          },
        });

        // Stage: ASSEMBLING
        await prisma.job.update({
          where: { id: jobId },
          data: { status: 'ASSEMBLING' },
        });

        const assemblyActions = await runAssemblerStage(formattedDocument);
        const outputBuffer = await buildDocx(jobId, assemblyActions);
        const outputKey = generateSpacesKey(jobId, 'output.docx');
        await uploadToSpaces(
          outputKey,
          outputBuffer,
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        );

        // Stage: COMPLETE
        await prisma.job.update({
          where: { id: jobId },
          data: {
            status: 'COMPLETE',
            outputPath: outputKey,
            processingCompletedAt: new Date(),
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const stack = err instanceof Error ? err.stack ?? '' : '';
        await prisma.job.update({
          where: { id: jobId },
          data: {
            status: 'FAILED',
            errorMessage: `${message}\n${stack}`.trim(),
            processingCompletedAt: new Date(),
          },
        });
        throw err;
      }
    },
    {
      connection,
      concurrency: 1,
    }
  );

  worker.on('completed', (job) => {
    console.log(`Job ${job.data.jobId} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.data?.jobId} failed:`, err.message);
  });

  console.log('BullMQ worker started for queue: manuscript-processing');
}
