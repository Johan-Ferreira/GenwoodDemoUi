'use client';

import { useCallback, useRef, useState } from 'react';

import { useToast } from '@/contexts/ToastContext';
import { FILE_STATUS_POLL_MS } from '@/lib/utils/constants';
import type { FileRow } from '@/types/files';

export const IMPORT_COMPLETE = 'Import complete.';
export const IMPORT_FAILED = 'Import failed. See the file log for details.';

/**
 * Re-check every 10 s for as long as the File log is visible, whatever the
 * loaded statuses — so a file newly dropped into the Inbox appears by itself.
 * (useDataState pauses it while the tab is hidden.)
 */
export function fileStatusRefreshDelay(): number {
  return FILE_STATUS_POLL_MS;
}

/**
 * Compares each loaded file's status with the one previously seen and raises
 * "Import complete." / "Import failed. …" on an observed Processing → Imported /
 * Processing → Failed change (R19, R20). Files seen for the first time never
 * raise a notice. `statuses` holds the latest seen status per file Id.
 */
export function useImportStatusNotices() {
  const { showToast } = useToast();
  const seen = useRef(new Map<number, string>());
  const [statuses, setStatuses] = useState<ReadonlyMap<number, string>>(
    () => new Map(),
  );

  const onFiles = useCallback(
    (files: readonly FileRow[]) => {
      let completed = false;
      let failed = false;
      let changed = false;
      for (const file of files) {
        const previous = seen.current.get(file.id);
        if (previous === file.status) continue;
        changed = true;
        if (previous === 'Processing' && file.status === 'Imported') {
          completed = true;
        }
        if (previous === 'Processing' && file.status === 'Failed') {
          failed = true;
        }
        seen.current.set(file.id, file.status);
      }
      if (completed) showToast({ variant: 'success', title: IMPORT_COMPLETE });
      if (failed) showToast({ variant: 'error', title: IMPORT_FAILED });
      if (changed) setStatuses(new Map(seen.current));
    },
    [showToast],
  );

  return { onFiles, statuses };
}
