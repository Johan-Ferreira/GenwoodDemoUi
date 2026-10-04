export interface TabItem { id: string; label: React.ReactNode; count?: number; }
export interface TabsProps {
  tabs: TabItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  /** line = underlined page tabs; segmented = compact toggle (e.g. Chart / Table). */
  variant?: 'line' | 'segmented';
  style?: React.CSSProperties;
}
export declare function Tabs(props: TabsProps): JSX.Element;
