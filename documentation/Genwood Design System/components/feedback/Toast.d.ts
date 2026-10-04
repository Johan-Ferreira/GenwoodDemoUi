export interface ToastProps {
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  title?: React.ReactNode;
  message?: React.ReactNode;
  /** Optional inline action, e.g. a ghost "View log" button. */
  action?: React.ReactNode;
  onClose?: () => void;
  style?: React.CSSProperties;
}
export declare function Toast(props: ToastProps): JSX.Element;
