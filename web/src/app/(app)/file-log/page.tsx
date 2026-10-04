import type { Metadata } from 'next';
import { Suspense } from 'react';

import { PageHeader } from '@/components/app-shell/PageHeader';
import { FileLogView } from '@/components/file-log/FileLogView';

export const metadata: Metadata = { title: 'File log' };

export default function FileLogPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="File log"
        subtitle="Every file received from the Bank of England, with its import outcome."
      />
      {/* The view reads the selected file from the URL (useSearchParams). */}
      <Suspense fallback={null}>
        <FileLogView />
      </Suspense>
    </div>
  );
}
