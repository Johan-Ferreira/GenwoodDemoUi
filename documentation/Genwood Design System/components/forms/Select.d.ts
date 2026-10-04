export interface SelectOption { value: string; label: string; }
export interface SelectProps {
  label?: string;
  hint?: string;
  error?: string;
  options: (SelectOption | string)[];
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  id?: string;
  style?: React.CSSProperties;
}
export declare function Select(props: SelectProps): JSX.Element;
