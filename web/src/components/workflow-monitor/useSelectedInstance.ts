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

/** Query parameter carrying the file log entry the run was opened from (`file=<Id>`). */
export const FROM_FILE_QUERY_PARAM = 'file';

/**
 * Link to the Workflow monitor with one run selected (its detail open). With
 * `single`, the Process instances table lists only that run (`view=single`).
 * With `fileId`, the link carries the file it was opened from (`file=<Id>`).
 */
export function workflowMonitorSelectionPath(
  id: string,
  options: { single?: boolean; fileId?: number | null } = {},
): string {
  const params = new URLSearchParams({ [INSTANCE_QUERY_PARAM]: id });
  if (options.single) params.set(VIEW_QUERY_PARAM, SINGLE_VIEW);
  if (options.fileId !== undefined && options.fileId !== null) {
    params.set(FROM_FILE_QUERY_PARAM, String(options.fileId));
  }
  return `${WORKFLOW_MONITOR_PATH}?${params.toString()}`;
}

/** A carried `file=<Id>` value as a positive integer File.Id, else null. */
function parseFileId(raw: string | null): number | null {
  if (raw === null || !/^\d+$/.test(raw.trim())) return null;
  const id = Number(raw.trim());
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/**
 * The run selected in the Workflow monitor, kept in the URL (`?instance=<Id>`)
 * so the selection is linkable. `select` updates the URL without scrolling,
 * and does nothing when the run is already selected. `singleView` is true when
 * the URL asks for only the selected run (`view=single`); `showAll` drops that
 * and keeps the selection (and any carried file). `fromFileId` is the file the
 * run was opened from (`file=<Id>`), or null.
 */
export function useSelectedInstance() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const raw = searchParams.get(INSTANCE_QUERY_PARAM);
  const selectedId = raw !== null && raw.trim() !== '' ? raw.trim() : null;
  const singleView =
    selectedId !== null && searchParams.get(VIEW_QUERY_PARAM) === SINGLE_VIEW;
  const fromFileId = parseFileId(searchParams.get(FROM_FILE_QUERY_PARAM));

  const select = useCallback(
    (id: string) => {
      // Re-selecting the open run would only add a duplicate history entry.
      if (id.trim() === selectedId) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set(INSTANCE_QUERY_PARAM, id);
      // The carried file belongs to the run it was opened with, not this one.
      params.delete(FROM_FILE_QUERY_PARAM);
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

  return { selectedId, select, singleView, showAll, fromFileId };
}
