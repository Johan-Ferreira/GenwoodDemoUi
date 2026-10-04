import React from 'react';
import { Icon } from '../core/Icon.jsx';
export function Checkbox({ label, checked, defaultChecked = false, indeterminate, onChange, disabled }) {
  const [inner, setInner] = React.useState(defaultChecked);
  const on = checked !== undefined ? checked : inner;
  const toggle = () => { if (disabled) return; if (checked === undefined) setInner(!on); onChange && onChange(!on); };
  const filled = on || indeterminate;
  return <label onClick={toggle} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1, font: 'var(--type-body)', color: 'var(--fg-1)', userSelect: 'none' }}>
    <span role="checkbox" aria-checked={indeterminate ? 'mixed' : on} style={{ width: 16, height: 16, flex: 'none', borderRadius: 'var(--radius-xs)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: filled ? 'var(--action-primary)' : 'var(--surface-card)', border: '1px solid ' + (filled ? 'var(--action-primary)' : 'var(--border-strong)'), transition: 'background var(--duration-fast)' }}>
      {indeterminate ? <Icon name="minus" size={12} color="#fff" /> : on ? <Icon name="check" size={12} color="#fff" /> : null}
    </span>
    {label}
  </label>;
}
