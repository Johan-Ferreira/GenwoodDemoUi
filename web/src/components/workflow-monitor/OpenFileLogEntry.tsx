'use client';

import { CircleAlert, FileSpreadsheet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { toServiceErrorShape } from '@/components/data-state/useDataState';
import { NotFoundMessage } from '@/components/data-state/NotFoundMessage';
import { fileLogSelectionPath } from '@/components/file-log/useSelectedFile';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { getImport } from '@/lib/api/endpoints';
import { lookUp } from '@/lib/api/not-found';
import { WORKFLOW_MONITOR_PATH } from '@/lib/navigation/nav-items';
import type { ServiceErrorShape } from '@/types/api';

export const IMPORT_NOT_FOUND = 'Import not found';

type ResolveState =
  | { status: 'idle' }
  | { status: 'resolving' }
  | { status: 'not-found' }
  | { status: 'error'; error: ServiceErrorShape };

/** ContextId (the WOID) → `GET /v1/imports/{Woid}` → File.Id; null when it cannot be found. */
async function resolveFileId(woid: string | undefined): Promise<number | null> {
  if (woid === undefined || woid.trim() === '') return null;
  const lookup = await lookUp(() => getImport(encodeURIComponent(woid.trim())));
  if (!lookup.found) return null;
  return lookup.value.File?.Id ?? null;
}

/**
 * "Open file log entry" (R7, BR3): opens the File log with the run's file
 * selected. Uses the file already resolved with the run when there is one;
 * otherwise resolves the run's ContextId on click. A 404 shows
 * "Import not found" with the route back, never the raw service error.
 */
export function OpenFileLogEntry({
  contextId,
  fileId,
}: {
  /** The run's ContextId (the import's WOID). */
  contextId: string | undefined;
  /** The run's file, when it was already resolved with the run. */
  fileId: number | null;
}) {
  const router = useRouter();
  const [state, setState] = useState<ResolveState>({ status: 'idle' });

  const open = async () => {
    if (fileId !== null) {
      router.push(fileLogSelectionPath(fileId));
      return;
    }
    setState({ status: 'resolving' });
    try {
      const resolved = await resolveFileId(contextId);
      if (resolved === null) {
        setState({ status: 'not-found' });
        return;
      }
      setState({ status: 'idle' });
      router.push(fileLogSelectionPath(resolved));
    } catch (error) {
      setState({ status: 'error', error: toServiceErrorShape(error) });
    }
  };

  return (
    <div className="flex flex-col items-start gap-3">
      <Button
        type="button"
        variant="secondary"
        onClick={open}
        disabled={state.status === 'resolving'}
      >
        <FileSpreadsheet aria-hidden="true" />
        Open file log entry
      </Button>
      {state.status === 'not-found' && (
        <NotFoundMessage
          message={IMPORT_NOT_FOUND}
          backHref={WORKFLOW_MONITOR_PATH}
          backLabel="Back to the process instance list"
        />
      )}
      {state.status === 'error' && (
        <Alert className="border-danger-border bg-danger-surface text-danger">
          <CircleAlert aria-hidden="true" />
          <AlertTitle>The file log entry could not be opened.</AlertTitle>
          <AlertDescription className="text-danger">
            <p>{state.error.description}</p>
            <p>Choose Open file log entry to try again.</p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
