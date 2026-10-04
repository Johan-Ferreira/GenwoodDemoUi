export interface BadgeProps {
  /** success = Imported, warning = Imported with warnings, danger = Failed, info = Processing, neutral = Queued. */
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  /** Leading status dot (default true). */
  dot?: boolean;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}
export declare function Badge(props: BadgeProps): JSX.Element;
