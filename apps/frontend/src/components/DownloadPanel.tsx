// apps/frontend/src/components/DownloadPanel.tsx
'use client';

import { getDownloadUrl } from '@/lib/api';

interface DownloadPanelProps {
  jobId: string;
}

export function DownloadPanel({ jobId }: DownloadPanelProps) {
  function handleDownload() {
    const url = getDownloadUrl(jobId);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journalforge-${jobId}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div
      className="p-6 border mt-8"
      style={{ borderColor: '#0D6E6E', backgroundColor: '#F0FDFD' }}
    >
      <div className="flex items-center gap-4 mb-4">
        <div
          className="w-12 h-12 flex items-center justify-center border"
          style={{ borderColor: '#0D6E6E' }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0D6E6E"
            strokeWidth="1.5"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-sm" style={{ color: '#0D6E6E' }}>
            Your formatted manuscript is ready
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
            HJ-compliant DOCX · Ready for Springer submission
          </p>
        </div>
      </div>

      <button
        onClick={handleDownload}
        className="w-full py-3 text-sm font-semibold uppercase tracking-widest transition-colors"
        style={{
          backgroundColor: '#0D6E6E',
          color: '#FFFFFF',
          border: 'none',
          cursor: 'pointer',
          fontFamily: "'Source Serif 4', serif",
        }}
      >
        Download Formatted Manuscript
      </button>
    </div>
  );
}
