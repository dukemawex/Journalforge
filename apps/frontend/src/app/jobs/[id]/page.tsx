// apps/frontend/src/app/jobs/[id]/page.tsx
'use client';

import { use } from 'react';
import { useJob } from '@/hooks/useJob';
import { JobStatus } from '@/components/JobStatus';
import { ComplianceReport } from '@/components/ComplianceReport';
import { DownloadPanel } from '@/components/DownloadPanel';

interface JobPageProps {
  params: Promise<{ id: string }>;
}

export default function JobPage({ params }: JobPageProps) {
  const { id } = use(params);
  const { job, error, isLoading } = useJob(id);

  if (isLoading && !job) {
    return (
      <div className="flex items-center gap-3" style={{ color: '#6B7280' }}>
        <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" opacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" />
        </svg>
        <span>Loading job…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border" style={{ borderColor: '#B91C1C', backgroundColor: '#FEF2F2' }}>
        <p className="text-sm font-semibold" style={{ color: '#B91C1C' }}>Error: {error}</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-4 border" style={{ borderColor: '#B91C1C', backgroundColor: '#FEF2F2' }}>
        <p className="text-sm font-semibold" style={{ color: '#B91C1C' }}>Job not found</p>
      </div>
    );
  }

  return (
    <div>
      <JobStatus job={job} />

      {job.status === 'COMPLETE' && (
        <div className="mt-10">
          {job.complianceReport && (
            <ComplianceReport report={job.complianceReport} />
          )}
          {job.downloadReady && (
            <DownloadPanel jobId={job.id} />
          )}
        </div>
      )}
    </div>
  );
}
