export interface CardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Right-aligned header controls (buttons, selects). */
  actions?: React.ReactNode;
  /** Muted footer strip — timestamps, source notes. */
  footer?: React.ReactNode;
  /** Inner padding in px (default 20). */
  padding?: number;
  /** Remove body padding — for tables and charts that bleed to the edge. */
  flush?: boolean;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}
export declare function Card(props: CardProps): JSX.Element;
export interface StatProps {
  label: string;
  value: React.ReactNode;
  unit?: string;
  /** Change text, e.g. "+3.2 bp vs prior day". */
  delta?: string;
  tone?: 'up' | 'down' | 'neutral';
}
export declare function Stat(props: StatProps): JSX.Element;
