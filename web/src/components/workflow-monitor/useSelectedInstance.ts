'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

import { WORKFLOW_MONITOR_PATH } from '@/lib/navigation/nav-items';

/** Query parameter that holds the selected run's Id (`/workflow-monitor?instance=<Id>`). */
export const INSTANCE_QUERY_PARAM = 'instance';

/** Query parameter that narrows the Process instances table (`view=single`). */
export const VIEW_QUERY_PARAM = 'view';

/** `view` value that lists only the selected run. */
export const SINGLE_VIEW = 'single';

/**
 * Link to the Workflow monitor with one run selected (its detail open). With
 * `single`, the Process instances table lists only that run (`view=single`).
 */
export function workflowMonitorSelectionPath(
  id: string,
  options: { single?: boolean } = {},
): string {
  const params = new URLSearchParams({ [INSTANCE_QUERY_PARAM]: id });
  if (options.single) params.set(VIEW_QUERY_PARAM, SINGLE_VIEW);
  return `${WORKFLOW_MONITOR_PATH}?${params.toString()}`;
}

/**
 * The run selected in the Workflow monitor, kept in the URL (`?instance=<Id>`)
 * so the selection is linkable. `select` updates the URL without scrolling,
 * and does nothing when the run is already selected. `singleView` is true when
 * the URL asks for only the selected run (`view=single`); `showAll` drops that
 * and keeps the selection.
 */
export function useSelectedInstance() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const raw = searchParams.get(INSTANCE_QUERY_PARAM);
  const selectedId = raw !== null && raw.trim() !== '' ? raw.trim() : null;
  const singleView =
    selectedId !== null && searchParams.get(VIEW_QUERY_PARAM) === SINGLE_VIEW;

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

  const showAll = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(VIEW_QUERY_PARAM);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  return { selectedId, select, singleView, showAll };
}
