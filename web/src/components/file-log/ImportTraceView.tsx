'use client';

import { useState } from 'react';

import { PageHeader } from '@/components/app-shell/PageHeader';

import { ImportTrace } from './ImportTrace';

const SUBTITLE = 'The file log entry, workflow instance and published data';

/** The Import trace subtitle: names the file once known, else ends at "data." */
export function importTraceSubtitle(fileName: string | null): string {
  return fileName ? `${SUBTITLE} for WOID ${fileName}.` : `${SUBTITLE}.`;
}

/** The Import trace page body: heading, subtitle naming the file, and the trace. */
export function ImportTraceView({ woid }: { woid: string }) {
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Import trace"
        subtitle={importTraceSubtitle(fileName)}
      />
      <ImportTrace
        woid={woid}
        onTrace={(trace) => {
          const name = trace.File?.FileName?.trim();
          setFileName(name ? name : null);
        }}
      />
    </div>
  );
}
