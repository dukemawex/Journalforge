// apps/frontend/src/components/UploadPanel.tsx
'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import { uploadFiles } from '@/lib/api';

const ACCEPTED_TYPES = {
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/pdf': ['.pdf'],
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FileZoneProps {
  label: string;
  description: string;
  file: File | null;
  onDrop: (file: File) => void;
  maxSize: number;
}

function FileZone({ label, description, file, onDrop, maxSize }: FileZoneProps) {
  const handleDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) onDrop(accepted[0]);
    },
    [onDrop]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop: handleDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: 1,
    maxSize,
  });

  const rejection = fileRejections[0];

  return (
    <div className="flex-1">
      <p
        className="text-xs font-semibold uppercase tracking-widest mb-2"
        style={{ color: '#0D6E6E' }}
      >
        {label}
      </p>
      <div
        {...getRootProps()}
        className="border p-8 cursor-pointer transition-colors"
        style={{
          borderColor: isDragActive ? '#0D6E6E' : '#1A1A1A',
          borderWidth: '1px',
          borderStyle: isDragActive ? 'dashed' : 'solid',
          backgroundColor: isDragActive ? '#0D6E6E1A' : 'transparent',
          minHeight: '160px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <input {...getInputProps()} />
        {file ? (
          <div className="text-center">
            <p className="font-semibold text-sm" style={{ fontFamily: "'Source Serif 4', serif" }}>
              {file.name}
            </p>
            <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
              {formatBytes(file.size)}
            </p>
          </div>
        ) : (
          <div className="text-center">
            <svg
              className="mx-auto mb-3"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              style={{ color: '#6B7280' }}
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              {isDragActive ? 'Drop file here' : description}
            </p>
            <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
              DOCX or PDF · max {formatBytes(maxSize)}
            </p>
          </div>
        )}
      </div>
      {rejection && (
        <p className="text-xs mt-1" style={{ color: '#B91C1C' }}>
          {rejection.errors[0]?.message ?? 'File rejected'}
        </p>
      )}
    </div>
  );
}

export function UploadPanel() {
  const router = useRouter();
  const [manuscript, setManuscript] = useState<File | null>(null);
  const [journalSpec, setJournalSpec] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = manuscript !== null && journalSpec !== null && !uploading;

  async function handleSubmit() {
    if (!manuscript || !journalSpec) return;
    setUploading(true);
    setError(null);
    try {
      const { jobId } = await uploadFiles(manuscript, journalSpec);
      router.push(`/jobs/${jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploading(false);
    }
  }

  return (
    <div>
      <h1
        className="text-4xl font-bold mb-2"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        Format Your Manuscript
      </h1>
      <p className="mb-10 text-base" style={{ color: '#4B5563' }}>
        Upload your manuscript and the Hydrogeology Journal author guidelines. Our AI
        pipeline will check compliance and produce a submission-ready DOCX.
      </p>

      <div className="flex gap-6 mb-8">
        <FileZone
          label="Manuscript"
          description="Drop your manuscript here or click to browse"
          file={manuscript}
          onDrop={setManuscript}
          maxSize={20 * 1024 * 1024}
        />
        <FileZone
          label="Journal Specification"
          description="Drop the HJ author guidelines here or click to browse"
          file={journalSpec}
          onDrop={setJournalSpec}
          maxSize={10 * 1024 * 1024}
        />
      </div>

      {error && (
        <p className="text-sm mb-4" style={{ color: '#B91C1C' }}>
          {error}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="px-10 py-3 text-sm font-semibold uppercase tracking-widest transition-colors"
        style={{
          backgroundColor: canSubmit ? '#0D6E6E' : '#D1D5DB',
          color: canSubmit ? '#FFFFFF' : '#9CA3AF',
          cursor: canSubmit ? 'pointer' : 'not-allowed',
          border: 'none',
          fontFamily: "'Source Serif 4', serif",
        }}
      >
        {uploading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" opacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
            Uploading…
          </span>
        ) : (
          'Submit for Formatting'
        )}
      </button>
    </div>
  );
}
