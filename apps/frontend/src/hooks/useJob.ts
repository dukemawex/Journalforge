// apps/frontend/src/hooks/useJob.ts
'use client';

import useSWR from 'swr';
import { fetchJob, JobResponse } from '@/lib/api';

export function useJob(jobId: string | null) {
  const { data, error, isLoading } = useSWR<JobResponse>(
    jobId ? ['job', jobId] : null,
    ([, id]: [string, string]) => fetchJob(id),
    {
      refreshInterval: (data) => {
        if (!data) return 3000;
        if (data.status === 'COMPLETE' || data.status === 'FAILED') return 0;
        return 3000;
      },
      revalidateOnFocus: false,
    }
  );

  return {
    job: data ?? null,
    error: error instanceof Error ? error.message : null,
    isLoading,
  };
}
