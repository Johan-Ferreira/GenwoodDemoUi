export interface IconProps {
  /** Lucide icon name, kebab-case (e.g. "file-text", "chart-line", "upload"). */
  name: string;
  /** Pixel size. 16 in controls, 20 in nav, 14 inline. */
  size?: number;
  /** Any CSS colour; defaults to currentColor. */
  color?: string;
  style?: React.CSSProperties;
  /** Accessible label; omit for decorative icons. */
  title?: string;
}
export declare function Icon(props: IconProps): JSX.Element;
