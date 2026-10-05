'use client';

import { ProcessInstanceDetail } from './ProcessInstanceDetail';
import { ProcessInstanceList } from './ProcessInstanceList';
import { useSelectedInstance } from './useSelectedInstance';

/**
 * The Workflow monitor content below the page header: the process instance
 * list, and below it the run selected in the URL (`?instance=<Id>`).
 */
export function WorkflowMonitorView() {
  const { selectedId, select, singleView, showAll } = useSelectedInstance();

  return (
    <div className="flex flex-col gap-4">
      <ProcessInstanceList
        selectedId={selectedId}
        singleView={singleView}
        onShowAll={showAll}
        onSelect={(instance) => {
          if (instance.ProcessInstanceId) select(instance.ProcessInstanceId);
        }}
      />
      {selectedId !== null && (
        // Keyed by the run: a new selection loads afresh.
        <ProcessInstanceDetail key={selectedId} instanceId={selectedId} />
      )}
    </div>
  );
}
