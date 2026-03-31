// apps/frontend/src/components/JobStatus.tsx
'use client';

import { JobResponse } from '@/lib/api';

type Stage = {
  key: JobResponse['status'];
  label: string;
};

const STAGES: Stage[] = [
  { key: 'PARSING', label: 'Parsing Document' },
  { key: 'FORMATTING', label: 'Formatting for HJ' },
  { key: 'ASSEMBLING', label: 'Assembling DOCX' },
  { key: 'COMPLETE', label: 'Complete' },
];

const STATUS_ORDER: Record<JobResponse['status'], number> = {
  PENDING: 0,
  PARSING: 1,
  FORMATTING: 2,
  ASSEMBLING: 3,
  COMPLETE: 4,
  FAILED: 5,
};

interface JobStatusProps {
  job: JobResponse;
}

export function JobStatus({ job }: JobStatusProps) {
  const currentOrder = STATUS_ORDER[job.status];
  const isFailed = job.status === 'FAILED';

  return (
    <div>
      <h2
        className="text-2xl font-bold mb-8"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        Processing Job
      </h2>
      <p className="text-xs mb-6" style={{ color: '#6B7280' }}>
        Job ID: <code className="font-mono">{job.id}</code>
      </p>

      <div className="flex flex-col gap-0">
        {STAGES.map((stage, index) => {
          const stageOrder = STATUS_ORDER[stage.key];
          const isComplete = !isFailed && currentOrder > stageOrder;
          const isActive =
            !isFailed &&
            (stage.key === job.status ||
              (job.status === 'PENDING' && stage.key === 'PARSING' && index === 0));
          const isFailedStage =
            isFailed &&
            currentOrder - 1 === stageOrder;

          let borderColor = '#D1D5DB';
          let bgColor = 'transparent';
          let textColor = '#9CA3AF';
          let iconContent: React.ReactNode = (
            <span className="text-xs font-mono" style={{ color: '#9CA3AF' }}>
              {index + 1}
            </span>
          );

          if (isComplete) {
            borderColor = '#0D6E6E';
            bgColor = '#0D6E6E1A';
            textColor = '#0D6E6E';
            iconContent = (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D6E6E" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            );
          } else if (isActive) {
            borderColor = '#0D6E6E';
            bgColor = '#F5F3EE';
            textColor = '#0D6E6E';
            iconContent = (
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0D6E6E" strokeWidth="2">
                <circle cx="12" cy="12" r="10" opacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
            );
          } else if (isFailedStage) {
            borderColor = '#B91C1C';
            bgColor = '#FEF2F2';
            textColor = '#B91C1C';
            iconContent = (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B91C1C" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            );
          }

          return (
            <div
              key={stage.key}
              className="flex items-center gap-4 p-4 border-l border-r border-b"
              style={{
                borderColor,
                borderTopWidth: index === 0 ? '1px' : '0',
                borderStyle: 'solid',
                backgroundColor: bgColor,
              }}
            >
              <div
                className="w-8 h-8 flex items-center justify-center border flex-shrink-0"
                style={{ borderColor, borderWidth: '1px', borderStyle: 'solid' }}
              >
                {iconContent}
              </div>
              <span className="text-sm font-semibold" style={{ color: textColor }}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      {isFailed && job.errorMessage && (
        <div
          className="mt-6 p-4 border"
          style={{ borderColor: '#B91C1C', borderWidth: '1px', backgroundColor: '#FEF2F2' }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#B91C1C' }}>
            Error
          </p>
          <pre className="text-xs whitespace-pre-wrap font-mono" style={{ color: '#7F1D1D' }}>
            {job.errorMessage}
          </pre>
        </div>
      )}
    </div>
  );
}
