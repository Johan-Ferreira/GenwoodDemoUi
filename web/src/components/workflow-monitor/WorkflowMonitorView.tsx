'use client';

import { ProcessInstanceList } from './ProcessInstanceList';

/** The Workflow monitor content below the page header: the process instance list. */
export function WorkflowMonitorView() {
  return (
    <div className="flex flex-col gap-4">
      <ProcessInstanceList />
    </div>
  );
}
