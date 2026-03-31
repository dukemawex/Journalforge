// apps/frontend/src/components/ComplianceReport.tsx
'use client';

import { useState } from 'react';
import { ComplianceReport as ComplianceReportType } from '@/lib/api';

interface SectionProps {
  title: string;
  count: number;
  color: string;
  bgColor: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({
  title,
  count,
  color,
  bgColor,
  children,
  defaultOpen = false,
}: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border" style={{ borderColor: '#1A1A1A', borderWidth: '1px' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        style={{ backgroundColor: bgColor }}
      >
        <span className="flex items-center gap-3">
          <span className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>
            {title}
          </span>
          <span
            className="text-xs font-bold px-2 py-0.5"
            style={{ backgroundColor: color, color: '#FFFFFF' }}
          >
            {count}
          </span>
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
            color: '#6B7280',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && <div className="px-5 py-4 border-t" style={{ borderColor: '#E5E7EB' }}>{children}</div>}
    </div>
  );
}

interface ComplianceReportProps {
  report: ComplianceReportType;
}

export function ComplianceReport({ report }: ComplianceReportProps) {
  return (
    <div>
      <h3
        className="text-xl font-bold mb-6"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        Compliance Report
      </h3>

      {report.passed ? (
        <div
          className="flex items-center gap-3 p-5 mb-6 border"
          style={{ borderColor: '#0D6E6E', backgroundColor: '#0D6E6E1A' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0D6E6E" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
          <span className="font-semibold" style={{ color: '#0D6E6E' }}>
            All compliance checks passed
          </span>
        </div>
      ) : (
        <div
          className="flex items-center gap-3 p-5 mb-6 border"
          style={{ borderColor: '#B91C1C', backgroundColor: '#FEF2F2' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B91C1C" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <circle cx="12" cy="16" r="0.5" fill="#B91C1C" />
          </svg>
          <span className="font-semibold" style={{ color: '#B91C1C' }}>
            {report.blocking_issues.length} blocking issue
            {report.blocking_issues.length !== 1 ? 's' : ''} require author action
          </span>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {report.blocking_issues.length > 0 && (
          <CollapsibleSection
            title="Blocking Issues"
            count={report.blocking_issues.length}
            color="#B91C1C"
            bgColor="#FEF2F2"
            defaultOpen
          >
            <div className="flex flex-col gap-4">
              {report.blocking_issues.map((issue, i) => (
                <div key={i} className="border-l-2 pl-4" style={{ borderColor: '#B91C1C' }}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#B91C1C' }}>
                    {issue.field}
                  </p>
                  <p className="text-sm mb-1" style={{ color: '#1A1A1A' }}>{issue.issue}</p>
                  <p className="text-xs" style={{ color: '#6B7280' }}>
                    <span className="font-semibold">Required: </span>{issue.action_required}
                  </p>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {report.warnings.length > 0 && (
          <CollapsibleSection
            title="Warnings"
            count={report.warnings.length}
            color="#B45309"
            bgColor="#FFFBEB"
          >
            <div className="flex flex-col gap-4">
              {report.warnings.map((warning, i) => (
                <div key={i} className="border-l-2 pl-4" style={{ borderColor: '#B45309' }}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#B45309' }}>
                    {warning.field}
                  </p>
                  <p className="text-sm mb-1" style={{ color: '#1A1A1A' }}>{warning.issue}</p>
                  <p className="text-xs" style={{ color: '#6B7280' }}>
                    <span className="font-semibold">Suggestion: </span>{warning.suggestion}
                  </p>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {report.auto_fixed.length > 0 && (
          <CollapsibleSection
            title="Auto-Fixed Items"
            count={report.auto_fixed.length}
            color="#0D6E6E"
            bgColor="#F0FDFD"
          >
            <div className="flex flex-col gap-4">
              {report.auto_fixed.map((fix, i) => (
                <div key={i} className="border-l-2 pl-4" style={{ borderColor: '#0D6E6E' }}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#0D6E6E' }}>
                    {fix.field}
                  </p>
                  <div className="flex flex-col gap-1">
                    <p className="text-xs">
                      <span className="font-semibold" style={{ color: '#6B7280' }}>Before: </span>
                      <span className="font-mono line-through" style={{ color: '#9CA3AF' }}>{fix.original}</span>
                    </p>
                    <p className="text-xs">
                      <span className="font-semibold" style={{ color: '#0D6E6E' }}>After: </span>
                      <span className="font-mono" style={{ color: '#1A1A1A' }}>{fix.fixed}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}
      </div>
    </div>
  );
}
