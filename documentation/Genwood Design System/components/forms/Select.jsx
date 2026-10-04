import React from 'react';
import { Icon } from '../core/Icon.jsx';
function Field({ label, hint, error, children, htmlFor }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
    {label && <label htmlFor={htmlFor} style={{ font: 'var(--type-label)', color: 'var(--fg-2)' }}>{label}</label>}
    {children}
    {(error || hint) && <div style={{ font: 'var(--type-caption)', color: error ? 'var(--status-danger-fg)' : 'var(--fg-3)' }}>{error || hint}</div>}
  </div>;
}
export function Select({ label, hint, error, options = [], value, defaultValue, onChange, disabled, size = 'md', id, style }) {
  const h = size === 'sm' ? 28 : size === 'lg' ? 44 : 36;
  const opts = options.map(o => typeof o === 'string' ? { value: o, label: o } : o);
  return <Field label={label} hint={hint} error={error} htmlFor={id}>
    <div style={{ position: 'relative', ...style }}>
      <select id={id} value={value} defaultValue={defaultValue} onChange={onChange} disabled={disabled}
        style={{ appearance: 'none', WebkitAppearance: 'none', width: '100%', height: h, padding: '0 34px 0 12px', font: 'var(--type-body)', fontSize: size === 'sm' ? 12 : 14, color: 'var(--fg-1)',
          background: disabled ? 'var(--surface-sunken)' : 'var(--surface-card)', border: '1px solid ' + (error ? 'var(--status-danger-fg)' : 'var(--border-strong)'), borderRadius: 'var(--radius-sm)', cursor: 'pointer', outlineColor: 'var(--border-focus)' }}>
        {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <Icon name="chevron-down" size={16} color="var(--fg-3)" style={{ position: 'absolute', right: 10, top: '50%', marginTop: -8, pointerEvents: 'none' }} />
    </div>
  </Field>;
}
