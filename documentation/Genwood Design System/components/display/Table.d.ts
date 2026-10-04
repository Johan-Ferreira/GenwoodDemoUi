export interface TableColumn<T = any> {
  key: string;
  header: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  /** Render values in IBM Plex Mono — use for every number, date and file name. */
  mono?: boolean;
  /** Secondary grey text. */
  muted?: boolean;
  wrap?: boolean;
  width?: number | string;
  render?: (value: any, row: T) => React.ReactNode;
}
export interface TableProps<T = any> {
  columns: TableColumn<T>[];
  rows: T[];
  /** Row field used as React key / selection id (default "id"). */
  rowKey?: string;
  onRowClick?: (row: T) => void;
  selectedKey?: string | number;
  /** Compact 7px rows for dense numeric grids. */
  dense?: boolean;
  stickyHeader?: boolean;
  maxHeight?: number | string;
  style?: React.CSSProperties;
}
export declare function Table(props: TableProps): JSX.Element;
