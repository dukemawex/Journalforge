-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PARSING', 'FORMATTING', 'ASSEMBLING', 'COMPLETE', 'FAILED');

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "manuscriptPath" TEXT NOT NULL,
    "journalSpecPath" TEXT NOT NULL,
    "outputPath" TEXT,
    "errorMessage" TEXT,
    "complianceReport" JSONB,
    "processingStartedAt" TIMESTAMP(3),
    "processingCompletedAt" TIMESTAMP(3),

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);
