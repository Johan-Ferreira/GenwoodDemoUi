import type { Metadata } from 'next';

import { PageHeader } from '@/components/app-shell/PageHeader';
import { ImportTrace } from '@/components/file-log/ImportTrace';

export const metadata: Metadata = { title: 'Import trace' };

export default async function ImportTracePage({
  params,
}: {
  params: Promise<{ woid: string }>;
}) {
  const { woid } = await params;
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Import trace"
        subtitle={`The file log entry, workflow instance and published data for WOID ${woid}.`}
      />
      <ImportTrace woid={woid} />
    </div>
  );
}
