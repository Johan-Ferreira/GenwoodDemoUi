'use client';

import { CircleAlert, Download } from 'lucide-react';
import { useState } from 'react';

import { toServiceErrorShape } from '@/components/data-state/useDataState';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useToast } from '@/contexts/ToastContext';
import { downloadFile } from '@/lib/api/download';
import type { ServiceErrorShape } from '@/types/api';

/** Toast shown once the CSV has been handed to the browser. */
export const CSV_EXPORT_PREPARED = 'CSV export prepared.';

/** Name the file is saved under when the service sends no Content-Disposition. */
export function csvExportFilename(code: string, date: string): string {
  return `${code}-${date}.csv`;
}

type ExportState =
  | { status: 'idle' }
  | { status: 'exporting' }
  | { status: 'error'; error: ServiceErrorShape };

/**
 * Exports one curve's rates for one valuation date as CSV: transient toast on
 * success, persistent error with Retry on failure (no confirmation then).
 */
export function useCsvExport() {
  const { showToast } = useToast();
  const [state, setState] = useState<ExportState>({ status: 'idle' });

  const exportCsv = async (code: string, date: string) => {
    setState({ status: 'exporting' });
    try {
      await downloadFile(
        `/v1/curves/${encodeURIComponent(code)}/rates.csv`,
        { ObservationDate: date },
        csvExportFilename(code, date),
      );
      setState({ status: 'idle' });
      showToast({ variant: 'success', title: CSV_EXPORT_PREPARED });
    } catch (error) {
      setState({ status: 'error', error: toServiceErrorShape(error) });
    }
  };

  return { state, exportCsv };
}

interface ExportCsvButtonProps {
  disabled: boolean;
  exporting: boolean;
  onExport: () => void;
}

/** Secondary "Export CSV" button with the download icon. */
export function ExportCsvButton({
  disabled,
  exporting,
  onExport,
}: ExportCsvButtonProps) {
  return (
    <Button
      type="button"
      variant="secondary"
      disabled={disabled || exporting}
      aria-busy={exporting || undefined}
      onClick={onExport}
    >
      <Download aria-hidden="true" />
      Export CSV
    </Button>
  );
}

/** Persistent export failure with Retry. */
export function ExportCsvFailure({
  error,
  onRetry,
}: {
  error: ServiceErrorShape;
  onRetry: () => void;
}) {
  return (
    <Alert className="basis-full border-danger-border bg-danger-surface text-danger">
      <CircleAlert aria-hidden="true" />
      <AlertTitle>The CSV export could not be prepared.</AlertTitle>
      <AlertDescription className="text-danger">
        <p>{error.description}</p>
        <p>Choose Retry to try again.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={onRetry}
        >
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
}
