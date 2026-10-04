'use client';

/**
 * Toast - one notification on the Genwood toast surface (Forest 900, white
 * 14px text, 6px radius). Lifetime is owned by ToastContext: about 2.6 s for
 * completed actions; persistent toasts stay until dismissed.
 */

import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';

import { IconButton } from '@/components/icon-button/IconButton';
import { cn } from '@/lib/utils';
import type { ToastProps, ToastVariant } from '@/types/toast';

const VARIANT_ICON: Record<ToastVariant, typeof Info> = {
  success: CircleCheck,
  error: CircleAlert,
  warning: TriangleAlert,
  info: Info,
};

export function Toast({ toast, onDismiss }: ToastProps) {
  const Icon = VARIANT_ICON[toast.variant];
  const urgent = toast.variant === 'error' || toast.persistent;

  const handleToastClick = () => {
    if (toast.onClick) {
      toast.onClick();
      onDismiss(toast.id);
    }
  };

  return (
    <div
      className={cn(
        'pointer-events-auto flex items-start gap-3 rounded-lg bg-toast px-4 py-3 text-sm text-toast-foreground shadow-md',
        'animate-in fade-in slide-in-from-bottom-2 duration-200',
        toast.onClick && 'cursor-pointer',
      )}
      role={urgent ? 'alert' : 'status'}
      aria-live={urgent ? 'assertive' : 'polite'}
      aria-atomic="true"
      data-variant={toast.variant}
      data-persistent={toast.persistent ? 'true' : undefined}
      onClick={toast.onClick ? handleToastClick : undefined}
    >
      <Icon
        className="mt-0.5 size-4 shrink-0 text-toast-muted"
        aria-hidden="true"
      />

      <div className="min-w-0 flex-1">
        <p className="font-medium">{toast.title}</p>
        {toast.message && (
          <p className="mt-1 text-toast-muted">{toast.message}</p>
        )}
      </div>

      {toast.dismissible && (
        <IconButton
          label="Dismiss notification"
          size="icon-sm"
          className="-my-1 -mr-2 size-6 text-toast-muted hover:bg-brand-action-hover hover:text-toast-foreground"
          onClick={(event) => {
            event.stopPropagation();
            onDismiss(toast.id);
          }}
        >
          <X aria-hidden="true" />
        </IconButton>
      )}
    </div>
  );
}
