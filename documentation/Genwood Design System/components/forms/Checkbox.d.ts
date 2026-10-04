export interface CheckboxProps {
  label?: React.ReactNode;
  /** Controlled state. Omit to let the component manage itself. */
  checked?: boolean;
  defaultChecked?: boolean;
  indeterminate?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
}
export declare function Checkbox(props: CheckboxProps): JSX.Element;
