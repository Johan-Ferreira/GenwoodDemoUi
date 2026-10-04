/**
 * Toast notification type definitions
 */

import { TOAST_SETTINGS } from '@/lib/utils/constants';

/**
 * ToastVariant - Available toast notification variants
 */
export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

/**
 * Toast - Individual toast notification object
 */
export interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
  /** Auto-dismiss delay in ms; 0 means it stays until dismissed. */
  duration: number;
  /** True when the message needs the user to act: never auto-dismisses. */
  persistent: boolean;
  dismissible: boolean;
  onClick?: () => void;
}

/**
 * ToastOptions - Options for creating a new toast via showToast
 */
export interface ToastOptions {
  variant: ToastVariant;
  title: string;
  message?: string;
  /** Override the default lifetime (about 2.6 s). Ignored when `persistent`. */
  duration?: number;
  /** Stays until the user dismisses it (states that need the user to act). */
  persistent?: boolean;
  dismissible?: boolean;
  onClick?: () => void;
}

/**
 * ToastContextValue - Context value for toast provider
 */
export interface ToastContextValue {
  toasts: Toast[];
  showToast: (options: ToastOptions) => void;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;
}

/**
 * ToastProps - Props for individual Toast component
 */
export interface ToastProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

/**
 * Default toast configuration values
 */
export const TOAST_DEFAULTS = {
  DURATION: TOAST_SETTINGS.DEFAULT_DURATION,
  MAX_TOASTS: TOAST_SETTINGS.MAX_TOASTS,
  DISMISSIBLE: true,
} as const;
