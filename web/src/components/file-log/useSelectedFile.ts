'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

/** Query parameter that holds the selected file's Id (`/file-log?file=101`). */
export const FILE_QUERY_PARAM = 'file';

export type FileSelection =
  | { kind: 'none' }
  | { kind: 'file'; id: number }
  /** `?file=` holds something that cannot be a file Id. */
  | { kind: 'invalid' };

function parseSelection(raw: string | null): FileSelection {
  if (raw === null || raw.trim() === '') return { kind: 'none' };
  const text = raw.trim();
  if (!/^\d+$/.test(text)) return { kind: 'invalid' };
  const id = Number(text);
  return Number.isSafeInteger(id) ? { kind: 'file', id } : { kind: 'invalid' };
}

/**
 * The file selected in the File log, kept in the URL (`?file=<Id>`) so the
 * selection is linkable. `select` updates the URL without scrolling.
 */
export function useSelectedFile() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const selection = parseSelection(searchParams.get(FILE_QUERY_PARAM));

  const select = useCallback(
    (id: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(FILE_QUERY_PARAM, String(id));
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return { selection, select };
}
