'use client';

import { useState } from 'react';

export const PAGE_SIZE_OPTIONS = [5, 10, 20, 50] as const;
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Pages an in-memory list. The current page is clamped to the last page, so
 * a shorter list (for example after filtering) never leaves an empty page.
 */
export function useClientPagination<T>(
  items: readonly T[],
  defaultPageSize: number = DEFAULT_PAGE_SIZE,
) {
  const [requestedPage, setRequestedPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(defaultPageSize);

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  const setPage = (next: number) => setRequestedPage(next);
  const setPageSize = (next: number) => {
    setPageSizeState(next);
    setRequestedPage(1);
  };

  return {
    page,
    pageSize,
    pageCount,
    pageItems,
    totalItems: items.length,
    firstItem: items.length === 0 ? 0 : start + 1,
    lastItem: start + pageItems.length,
    setPage,
    setPageSize,
  };
}
