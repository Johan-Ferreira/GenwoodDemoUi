export interface RadioProps {
  label?: React.ReactNode;
  checked?: boolean;
  value?: string;
  name?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
}
export declare function Radio(props: RadioProps): JSX.Element;
export interface RadioGroupProps {
  options: ({ value: string; label: string; disabled?: boolean } | string)[];
  value?: string;
  name?: string;
  direction?: 'row' | 'column';
  onChange?: (value: string) => void;
}
export declare function RadioGroup(props: RadioGroupProps): JSX.Element;
