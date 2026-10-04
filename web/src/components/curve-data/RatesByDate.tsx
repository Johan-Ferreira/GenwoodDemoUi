'use client';

import { DataState } from '@/components/data-state/DataState';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getCurveRateMatrix } from '@/lib/api/endpoints';
import { formatDecimal4 } from '@/lib/curves/curve-format';
import { layOutRateMatrix, type MatrixLayout } from '@/lib/curves/rate-matrix';
import { cn } from '@/lib/utils';

import {
  CELL_CLASS,
  HEAD_CLASS,
  NoDataImported,
  TableFooter,
  TableSkeleton,
} from './RatesByMaturity';

/** What to do next when the range has no imported data. */
export const NO_DATA_IN_RANGE_HINT =
  'Choose another date range or import a file.';

interface MatrixTableProps {
  layout: MatrixLayout;
  /** The valuation date chosen in By maturity; its row is highlighted. */
  selectedDate: string | null;
}

/** Dates as rows (newest first), one "{label} (%)" column per tenor. */
function MatrixTable({ layout, selectedDate }: MatrixTableProps) {
  return (
    <div className="max-h-(--layout-table-max-height) overflow-auto [&>[data-slot=table-container]]:overflow-visible">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={HEAD_CLASS}>Valuation date</TableHead>
            {layout.tenors.map((label) => (
              <TableHead key={label} className={`${HEAD_CLASS} text-right`}>
                {label} (%)
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {layout.rows.map((row) => (
            <TableRow
              key={row.date}
              data-selected={row.date === selectedDate || undefined}
              className="data-[selected]:bg-selected"
            >
              <TableHead
                scope="row"
                className={cn(CELL_CLASS, 'h-auto font-normal text-foreground')}
              >
                {row.date}
              </TableHead>
              {row.values.map((value, index) => (
                <TableCell
                  key={layout.tenors[index]}
                  className={`${CELL_CLASS} text-right`}
                >
                  {formatDecimal4(value)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface RatesByDateProps {
  code: string;
  /** Range bounds (valid YYYY-MM-DD) or null for no bound. */
  from: string | null;
  to: string | null;
  /** Tenor labels to request, in column order. */
  tenors: readonly string[];
  selectedDate: string | null;
}

/**
 * The by-date matrix for a curve: GET .../rate-matrix for the range and
 * tenors, rows matched to columns by tenor label. No rows → "No data imported".
 */
export function RatesByDate({
  code,
  from,
  to,
  tenors,
  selectedDate,
}: RatesByDateProps) {
  const tenorParam = tenors.join(',');
  return (
    <DataState
      key={`${code}|${from ?? ''}|${to ?? ''}|${tenorParam}`}
      load={() =>
        getCurveRateMatrix(code, {
          ObservationDateFrom: from ?? undefined,
          ObservationDateTo: to ?? undefined,
          Tenors: tenorParam || undefined,
        })
      }
      skeleton={<TableSkeleton />}
    >
      {(matrix) => {
        const layout = layOutRateMatrix(matrix);
        return (
          <>
            <MatrixTable layout={layout} selectedDate={selectedDate} />
            {layout.rows.length === 0 ? (
              <NoDataImported hint={NO_DATA_IN_RANGE_HINT} />
            ) : (
              <TableFooter>
                <p>
                  {layout.rows.length} valuation{' '}
                  {layout.rows.length === 1 ? 'date' : 'dates'}. Rates in
                  percent.
                </p>
              </TableFooter>
            )}
          </>
        );
      }}
    </DataState>
  );
}
