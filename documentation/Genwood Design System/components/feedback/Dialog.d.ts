export interface DialogProps {
  open: boolean;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  /** Right-aligned action buttons. Primary action last. */
  footer?: React.ReactNode;
  onClose?: () => void;
  /** Max width in px (default 480). */
  width?: number;
}
export declare function Dialog(props: DialogProps): JSX.Element | null;
