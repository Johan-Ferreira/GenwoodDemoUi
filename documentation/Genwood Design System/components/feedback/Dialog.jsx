import React from 'react';
import { IconButton } from '../core/IconButton.jsx';
export function Dialog({ open, title, description, children, footer, onClose, width = 480 }) {
  if (!open) return null;
  return <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'var(--surface-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
    <div role="dialog" aria-modal="true" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: width, maxHeight: '100%', overflow: 'auto', background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '20px 20px 0 24px' }}>
        <div style={{ flex: 1 }}><h2 style={{ margin: 0, font: 'var(--type-h2)', fontSize: 18, color: 'var(--fg-1)' }}>{title}</h2>
          {description && <p style={{ margin: '6px 0 0', font: 'var(--type-body)', color: 'var(--fg-2)' }}>{description}</p>}</div>
        {onClose && <IconButton icon="x" label="Close" size="sm" onClick={onClose} />}
      </div>
      {children && <div style={{ padding: '16px 24px' }}>{children}</div>}
      {footer && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 24px', borderTop: '1px solid var(--border-subtle)', marginTop: children ? 0 : 16 }}>{footer}</div>}
    </div>
  </div>;
}
