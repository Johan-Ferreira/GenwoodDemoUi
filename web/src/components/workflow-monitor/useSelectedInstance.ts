'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

import { WORKFLOW_MONITOR_PATH } from '@/lib/navigation/nav-items';

/** Query parameter that holds the selected run's Id (`/workflow-monitor?instance=<Id>`). */
export const INSTANCE_QUERY_PARAM = 'instance';

/** Link to the Workflow monitor with one run selected (its detail open). */
export function workflowMonitorSelectionPath(id: string): string {
  const params = new URLSearchParams({ [INSTANCE_QUERY_PARAM]: id });
  return `${WORKFLOW_MONITOR_PATH}?${params.toString()}`;
}

/**
 * The run selected in the Workflow monitor, kept in the URL (`?instance=<Id>`)
 * so the selection is linkable. `select` updates the URL without scrolling,
 * and does nothing when the run is already selected.
 */
export function useSelectedInstance() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const raw = searchParams.get(INSTANCE_QUERY_PARAM);
  const selectedId = raw !== null && raw.trim() !== '' ? raw.trim() : null;

  const select = useCallback(
    (id: string) => {
      // Re-selecting the open run would only add a duplicate history entry.
      if (id.trim() === selectedId) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set(INSTANCE_QUERY_PARAM, id);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams, selectedId],
  );

  return { selectedId, select };
}
