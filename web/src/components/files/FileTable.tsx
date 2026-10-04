import { StatusChip } from '@/components/status-chip/StatusChip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  fileStatusTone,
  formatCount,
  formatFileSize,
  shortWoid,
} from '@/lib/files/file-format';
import type { FileRow } from '@/types/files';

const HEAD_CLASS =
  'h-9 px-3 text-overline font-semibold uppercase tracking-wide text-muted-foreground';
const CELL_CLASS = 'px-3 py-2.5';

/**
 * The file-log columns (ID, File, Curve family, Received, Size, Records
 * inserted, WOID, Status) for the given rows, in the order supplied.
 */
export function FileTable({ rows }: { rows: readonly FileRow[] }) {
  return (
    <Table>
      <TableHeader className="bg-muted">
        <TableRow className="hover:bg-transparent">
          <TableHead className={`${HEAD_CLASS} w-14`}>ID</TableHead>
          <TableHead className={HEAD_CLASS}>File</TableHead>
          <TableHead className={HEAD_CLASS}>Curve family</TableHead>
          <TableHead className={HEAD_CLASS}>Received</TableHead>
          <TableHead className={`${HEAD_CLASS} text-right`}>Size</TableHead>
          <TableHead className={`${HEAD_CLASS} text-right`}>
            Records inserted
          </TableHead>
          <TableHead className={HEAD_CLASS}>WOID</TableHead>
          <TableHead className={HEAD_CLASS}>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell
              className={`${CELL_CLASS} font-mono text-muted-foreground`}
            >
              {row.id}
            </TableCell>
            <TableCell className={`${CELL_CLASS} font-mono`}>
              {row.fileName}
            </TableCell>
            <TableCell className={CELL_CLASS}>{row.curveFamily}</TableCell>
            <TableCell className={`${CELL_CLASS} font-mono`}>
              {row.receivedAt}
            </TableCell>
            <TableCell className={`${CELL_CLASS} text-right font-mono`}>
              {formatFileSize(row.sizeBytes)}
            </TableCell>
            <TableCell className={`${CELL_CLASS} text-right font-mono`}>
              {formatCount(row.recordsInserted)}
            </TableCell>
            <TableCell
              className={`${CELL_CLASS} font-mono text-muted-foreground`}
              title={row.woid}
            >
              {shortWoid(row.woid)}
            </TableCell>
            <TableCell className={CELL_CLASS}>
              <StatusChip
                tone={fileStatusTone(row.status)}
                label={row.status}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
