'use client';

import { useRouter } from 'next/navigation';
import { useId, useMemo } from 'react';

import { fileLogSelectionPath } from '@/components/file-log/useSelectedFile';
import { FileTable } from '@/components/files/FileTable';
import { compareNewestFirst, toFileRow } from '@/lib/api/files';
import type { FileRead } from '@/types/api-generated';

export const RECENT_LOADS_TITLE = 'Recent loads';
export const NO_FILES_RECEIVED = 'No files have been received yet.';
const RECENT_LOADS_LIMIT = 5;

/**
 * "Recent loads": the five newest files (sorted here, newest first — the
 * service order is not relied on) in the File log's table. A row opens the
 * File log with that file selected.
 */
export function RecentLoadsCard({
  files,
}: {
  files: readonly FileRead[] | undefined;
}) {
  const titleId = useId();
  const router = useRouter();
  const rows = useMemo(
    () =>
      (files ?? [])
        .map(toFileRow)
        .sort(compareNewestFirst)
        .slice(0, RECENT_LOADS_LIMIT),
    [files],
  );

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm"
    >
      <h2 id={titleId} className="px-5 py-4 text-base font-semibold">
        {RECENT_LOADS_TITLE}
      </h2>
      {rows.length === 0 ? (
        <p className="border-t px-5 py-6 text-muted-foreground">
          {NO_FILES_RECEIVED}
        </p>
      ) : (
        <div className="border-t">
          <FileTable
            rows={rows}
            onSelect={(row) => router.push(fileLogSelectionPath(row.id))}
          />
        </div>
      )}
    </section>
  );
}
