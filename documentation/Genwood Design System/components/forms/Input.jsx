import React from 'react';
import { Icon } from '../core/Icon.jsx';
function Field({ label, hint, error, children, htmlFor }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
    {label && <label htmlFor={htmlFor} style={{ font: 'var(--type-label)', color: 'var(--fg-2)' }}>{label}</label>}
    {children}
    {(error || hint) && <div style={{ font: 'var(--type-caption)', color: error ? 'var(--status-danger-fg)' : 'var(--fg-3)' }}>{error || hint}</div>}
  </div>;
}
export function Input({ label, hint, error, icon, suffix, size = 'md', value, defaultValue, onChange, placeholder, disabled, type = 'text', mono, id, style }) {
  const [focus, setFocus] = React.useState(false);
  const h = size === 'sm' ? 28 : size === 'lg' ? 44 : 36;
  const bd = error ? 'var(--status-danger-fg)' : focus ? 'var(--border-focus)' : 'var(--border-strong)';
  return <Field label={label} hint={hint} error={error} htmlFor={id}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: h, padding: '0 12px', background: disabled ? 'var(--surface-sunken)' : 'var(--surface-card)',
      border: '1px solid ' + bd, borderRadius: 'var(--radius-sm)', boxShadow: focus ? '0 0 0 3px var(--gw-forest-100)' : 'none', transition: 'box-shadow var(--duration-fast), border-color var(--duration-fast)', ...style }}>
      {icon && <Icon name={icon} size={16} color="var(--fg-3)" />}
      <input id={id} type={type} value={value} defaultValue={defaultValue} onChange={onChange} placeholder={placeholder} disabled={disabled}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{ flex: 1, minWidth: 0, border: 0, outline: 0, background: 'transparent', color: 'var(--fg-1)', font: mono ? 'var(--type-data)' : 'var(--type-body)', fontSize: size === 'sm' ? 12 : 14 }} />
      {suffix && <span style={{ font: 'var(--type-caption)', color: 'var(--fg-3)' }}>{suffix}</span>}
    </div>
  </Field>;
}
