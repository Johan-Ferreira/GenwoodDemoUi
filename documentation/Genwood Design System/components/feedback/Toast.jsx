import React from 'react';
import { Icon } from '../core/Icon.jsx';
const ICONS = { success: 'circle-check', warning: 'triangle-alert', danger: 'circle-x', info: 'info', neutral: 'bell' };
export function Toast({ tone = 'info', title, message, onClose, action, style }) {
  return <div role="status" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', width: 360, maxWidth: '100%', padding: '12px 14px', background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', ...style }}>
    <Icon name={ICONS[tone]} size={18} color={'var(--status-' + tone + '-fg)'} style={{ marginTop: 1 }} />
    <div style={{ flex: 1, minWidth: 0 }}>
      {title && <div style={{ font: 'var(--type-label)', fontSize: 13, color: 'var(--fg-1)' }}>{title}</div>}
      {message && <div style={{ font: 'var(--type-caption)', color: 'var(--fg-2)', marginTop: 2 }}>{message}</div>}
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
    {onClose && <button aria-label="Dismiss" onClick={onClose} style={{ border: 0, background: 'transparent', padding: 2, cursor: 'pointer', color: 'var(--fg-3)', display: 'flex' }}><Icon name="x" size={14} /></button>}
  </div>;
}
