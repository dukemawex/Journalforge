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
  journalSpec: File,
  onProgress?: (percent: number) => void
): Promise<{ jobId: string; pollingUrl: string }> {
  const formData = new FormData();
  formData.append('manuscript', manuscript);
  formData.append('journalSpec', journalSpec);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as { jobId: string; pollingUrl: string });
        } catch {
          reject(new Error('Failed to parse server response'));
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText) as { error?: string };
          reject(new Error(error.error ?? 'Upload failed'));
        } catch {
          reject(new Error('Upload failed'));
        }
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

    xhr.open('POST', `${API_URL}/upload`);
    xhr.setRequestHeader('X-API-Secret', API_SECRET);
    xhr.send(formData);
  });
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
