'use client';

import { DataState } from '@/components/data-state/DataState';
import { FileTable } from '@/components/files/FileTable';
import { TablePagination } from '@/components/table-pagination/TablePagination';
import { useClientPagination } from '@/components/table-pagination/useClientPagination';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getAllFiles } from '@/lib/api/files';
import type { FileRow } from '@/types/files';

const EMPTY_MESSAGE = 'No files have been received yet.';
const SOURCE_NOTE =
  'Source: Bank of England yield curves, picked up from the Inbox folder.';

function FileLogSkeleton() {
  return (
    <Card className="gap-3 p-4">
      <Skeleton className="h-6 w-full" />
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-5 w-full" />
      ))}
    </Card>
  );
}

/** The loaded list: a flush table card with paging and the source note. */
function FileLogTableCard({ files }: { files: readonly FileRow[] }) {
  const pagination = useClientPagination(files);

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <FileTable rows={pagination.pageItems} />
      <div className="flex flex-wrap items-center justify-between gap-4 border-t bg-muted px-3 py-2.5">
        <p className="text-muted-foreground">{SOURCE_NOTE}</p>
        <TablePagination
          page={pagination.page}
          pageCount={pagination.pageCount}
          pageSize={pagination.pageSize}
          totalItems={pagination.totalItems}
          firstItem={pagination.firstItem}
          lastItem={pagination.lastItem}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
          itemLabel="files"
        />
      </div>
    </Card>
  );
}

/** Every received file, newest first, loaded once and paged in the browser. */
export function FileLogView() {
  return (
    <DataState
      load={() => getAllFiles()}
      skeleton={<FileLogSkeleton />}
      isEmpty={(files) => files.length === 0}
      empty={EMPTY_MESSAGE}
    >
      {(files) => <FileLogTableCard files={files} />}
    </DataState>
  );
}
