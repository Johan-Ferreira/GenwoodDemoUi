import type { Metadata } from 'next';
import { Suspense } from 'react';

import { PageHeader } from '@/components/app-shell/PageHeader';
import { WorkflowMonitorView } from '@/components/workflow-monitor/WorkflowMonitorView';

export const metadata: Metadata = { title: 'Workflow monitor' };

export default function WorkflowMonitorPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Workflow monitor"
        subtitle="Each import runs as a workflow instance. Select one to trace it from receipt to publication."
      />
      {/* The view may read the selected run from the URL (useSearchParams). */}
      <Suspense fallback={null}>
        <WorkflowMonitorView />
      </Suspense>
    </div>
  );
}
