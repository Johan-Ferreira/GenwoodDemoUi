'use client';

/**
 * ToastContainer - renders active toasts bottom-right, 24px from the viewport
 * edges, up to 380px wide (Genwood toast spec).
 */

import { useToast } from '@/contexts/ToastContext';
import { TOAST_SETTINGS } from '@/lib/utils/constants';

import { Toast } from './Toast';

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  const visibleToasts = toasts.slice(-TOAST_SETTINGS.MAX_TOASTS);

  if (visibleToasts.length === 0) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed right-(--layout-toast-inset) bottom-(--layout-toast-inset) z-50 flex w-full max-w-(--layout-toast-max) flex-col gap-2"
      role="region"
      aria-label="Notifications"
      data-position="bottom-right"
    >
      {visibleToasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
}
