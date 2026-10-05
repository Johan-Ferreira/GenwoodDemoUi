'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { DataState } from '@/components/data-state/DataState';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getCurveRates } from '@/lib/api/endpoints';
import {
  formatDecimal4,
  formatInteger,
  joinRatesToTenors,
  type MaturityRow,
} from '@/lib/curves/curve-format';
import { importTracePath, NO_VALUE, shortWoid } from '@/lib/files/file-format';
import type { TenorRead } from '@/types/api-generated';

export const NO_DATA_IMPORTED = 'No data imported';
export const NO_DATA_HINT = 'Choose another valuation date or import a file.';

export const HEAD_CLASS =
  'sticky top-0 z-10 h-9 bg-card px-3 text-overline font-semibold uppercase tracking-wide text-muted-foreground';
export const CELL_CLASS = 'px-3 py-2 font-mono text-xs';
const MUTED_CELL_CLASS = `${CELL_CLASS} text-muted-foreground`;

const COLUMNS: ReadonlyArray<{ label: string; numeric?: boolean }> = [
  { label: 'Tenor' },
  { label: 'Years', numeric: true },
  { label: 'Months', numeric: true },
  { label: 'Source column' },
  { label: 'Rate (%)', numeric: true },
  { label: 'Source row', numeric: true },
  { label: 'Source import (WOID)' },
];

function MaturityTableRow({ tenor, rate }: MaturityRow) {
  return (
    <TableRow>
      <TableCell className={CELL_CLASS}>{tenor.Label ?? NO_VALUE}</TableCell>
      <TableCell className={`${CELL_CLASS} text-right`}>
        {formatDecimal4(tenor.Years)}
      </TableCell>
      <TableCell className={`${CELL_CLASS} text-right`}>
        {formatInteger(tenor.Months)}
      </TableCell>
      <TableCell className={MUTED_CELL_CLASS}>
        {tenor.SourceColumn ?? NO_VALUE}
      </TableCell>
      <TableCell className={`${CELL_CLASS} text-right font-semibold`}>
        {formatDecimal4(rate?.RatePercent)}
      </TableCell>
      <TableCell className={`${MUTED_CELL_CLASS} text-right`}>
        {formatInteger(rate?.SourceRowId)}
      </TableCell>
      <TableCell className={CELL_CLASS}>
        {rate?.Woid ? (
          <Link
            href={importTracePath(rate.Woid)}
            title={rate.Woid}
            className="focus-ring rounded-sm text-primary underline underline-offset-2"
          >
            {shortWoid(rate.Woid)}
          </Link>
        ) : (
          NO_VALUE
        )}
      </TableCell>
    </TableRow>
  );
}

/** The by-maturity table: sticky header, scrolling inside the card. */
function MaturityTable({ rows }: { rows: readonly MaturityRow[] }) {
  return (
    <div className="max-h-(--layout-table-max-height) overflow-auto [&>[data-slot=table-container]]:overflow-visible">
      <Table>
        <TableHeader>
          <TableRow>
            {COLUMNS.map((column) => (
              <TableHead
                key={column.label}
                className={
                  column.numeric ? `${HEAD_CLASS} text-right` : HEAD_CLASS
                }
              >
                {column.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <MaturityTableRow
              key={row.tenor.Label ?? `tenor-${index}`}
              tenor={row.tenor}
              rate={row.rate}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** The muted footer under a curve table. */
export function TableFooter({ children }: { children: ReactNode }) {
  return (
    <div className="border-t bg-muted px-3 py-2.5 text-muted-foreground">
      {children}
    </div>
  );
}

/** "No data imported" with what to do next (BR1: never an error). */
export function NoDataImported({ hint = NO_DATA_HINT }: { hint?: string }) {
  return (
    <TableFooter>
      <p className="font-medium text-foreground">{NO_DATA_IMPORTED}</p>
      <p>{hint}</p>
    </TableFooter>
  );
}

/** Placeholder rows while a curve table loads. */
export function TableSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-3">
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-2/3" />
    </div>
  );
}

interface RatesByMaturityProps {
  code: string;
  tenors: readonly TenorRead[];
  /** A valid YYYY-MM-DD valuation date. */
  date: string;
}

/**
 * The rate at each of the curve's tenors on `date`, one row per service tenor
 * joined to GET .../rates by tenor label. Rows link to their source import.
 */
export function RatesByMaturity({ code, tenors, date }: RatesByMaturityProps) {
  return (
    <DataState
      key={`${code}|${date}`}
      load={() => getCurveRates(code, { ObservationDate: date })}
      skeleton={<TableSkeleton />}
    >
      {(list) => {
        const rows = joinRatesToTenors(tenors, list.Rates ?? []);
        return (
          <>
            <MaturityTable rows={rows} />
            {rows.length === 0 ? (
              <NoDataImported />
            ) : (
              <TableFooter>
                <p>Valuation date {date}. Rates in percent.</p>
              </TableFooter>
            )}
          </>
        );
      }}
    </DataState>
  );
}
