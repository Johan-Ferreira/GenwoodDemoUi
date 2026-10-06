import type { Metadata } from 'next';

import { ImportTraceView } from '@/components/file-log/ImportTraceView';

export const metadata: Metadata = { title: 'Import trace' };

export default async function ImportTracePage({
  params,
}: {
  params: Promise<{ woid: string }>;
}) {
  const { woid } = await params;
  return <ImportTraceView woid={woid} />;
}
