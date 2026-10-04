export interface ButtonProps {
  /** primary = Forest fill (one per view); secondary = white + stone border; ghost = text-only; danger = clay. */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  /** Leading Lucide icon name. */
  icon?: string;
  /** Trailing Lucide icon name. */
  iconRight?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}
export declare function Button(props: ButtonProps): JSX.Element;
