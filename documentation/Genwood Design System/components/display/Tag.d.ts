export interface TagProps {
  children?: React.ReactNode;
  /** Selected/active filter state — Forest tint. */
  selected?: boolean;
  onClick?: () => void;
  /** Shows an × and calls this when clicked. */
  onRemove?: () => void;
  /** Optional series-colour line key (for chart legends). */
  color?: string;
  style?: React.CSSProperties;
}
export declare function Tag(props: TagProps): JSX.Element;
