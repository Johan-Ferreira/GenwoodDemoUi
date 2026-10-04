export interface IconButtonProps {
  /** Lucide icon name. */
  icon: string;
  /** Required accessible label (also shown as native tooltip). */
  label: string;
  /** onBrand = for use on the Forest header. */
  variant?: 'ghost' | 'secondary' | 'primary' | 'onBrand';
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}
export declare function IconButton(props: IconButtonProps): JSX.Element;
