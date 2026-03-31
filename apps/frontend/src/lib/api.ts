// apps/frontend/src/lib/api.ts
const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8080';
const API_SECRET = process.env['NEXT_PUBLIC_API_SECRET'] ?? '';

function getHeaders(includeContentType = false): HeadersInit {
  const headers: HeadersInit = {
    'X-API-Secret': API_SECRET,
  };
  if (includeContentType) {
    (headers as Record<string, string>)['Content-Type'] = 'application/json';
  }
  return headers;
}

export async function uploadFiles(
  manuscript: File,
  journalSpec: File
): Promise<{ jobId: string; pollingUrl: string }> {
  const formData = new FormData();
  formData.append('manuscript', manuscript);
  formData.append('journalSpec', journalSpec);

  const response = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    headers: getHeaders(),
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error((error as { error?: string }).error ?? 'Upload failed');
  }

  return response.json();
}

export async function fetchJob(jobId: string): Promise<JobResponse> {
  const response = await fetch(`${API_URL}/jobs/${jobId}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch job' }));
    throw new Error((error as { error?: string }).error ?? 'Failed to fetch job');
  }

  return response.json();
}

export function getDownloadUrl(jobId: string): string {
  return `${API_URL}/download/${jobId}`;
}

export interface ComplianceIssue {
  field: string;
  issue: string;
  action_required: string;
}

export interface ComplianceWarning {
  field: string;
  issue: string;
  suggestion: string;
}

export interface ComplianceAutoFixed {
  field: string;
  original: string;
  fixed: string;
}

export interface ComplianceReport {
  passed: boolean;
  blocking_issues: ComplianceIssue[];
  warnings: ComplianceWarning[];
  auto_fixed: ComplianceAutoFixed[];
}

export interface JobResponse {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: 'PENDING' | 'PARSING' | 'FORMATTING' | 'ASSEMBLING' | 'COMPLETE' | 'FAILED';
  manuscriptPath: string;
  journalSpecPath: string;
  outputPath: string | null;
  errorMessage: string | null;
  complianceReport: ComplianceReport | null;
  processingStartedAt: string | null;
  processingCompletedAt: string | null;
  downloadReady: boolean;
}
