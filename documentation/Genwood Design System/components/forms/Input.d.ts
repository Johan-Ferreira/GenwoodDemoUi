export interface InputProps {
  label?: string;
  hint?: string;
  /** Error text — turns border clay and replaces hint. */
  error?: string;
  /** Leading Lucide icon. */
  icon?: string;
  /** Trailing unit text, e.g. "%" or "yrs". */
  suffix?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Use IBM Plex Mono for numeric / code entry. */
  mono?: boolean;
  type?: string;
  id?: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  style?: React.CSSProperties;
}
export declare function Input(props: InputProps): JSX.Element;
