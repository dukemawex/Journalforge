// apps/api/src/services/jobQueue.ts
import { Queue, Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { parseDocument } from './documentParser';
import { runParserStage, runFormatterStage, runAssemblerStage } from './aiPipeline';
import { buildDocx } from './docxBuilder';

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
  const worker = new Worker<{ jobId: string }>(
    'manuscript-processing',
    async (job: Job<{ jobId: string }>) => {
      const { jobId } = job.data;

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
          parseDocument(dbJob.manuscriptPath),
          parseDocument(dbJob.journalSpecPath),
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
        const outputPath = await buildDocx(jobId, assemblyActions);

        // Stage: COMPLETE
        await prisma.job.update({
          where: { id: jobId },
          data: {
            status: 'COMPLETE',
            outputPath,
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
