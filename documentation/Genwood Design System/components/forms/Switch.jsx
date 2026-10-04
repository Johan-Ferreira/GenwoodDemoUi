import React from 'react';
export function Switch({ label, checked, defaultChecked = false, onChange, disabled }) {
  const [inner, setInner] = React.useState(defaultChecked);
  const on = checked !== undefined ? checked : inner;
  const toggle = () => { if (disabled) return; if (checked === undefined) setInner(!on); onChange && onChange(!on); };
  return <label onClick={toggle} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1, font: 'var(--type-body)', color: 'var(--fg-1)', userSelect: 'none' }}>
    <span role="switch" aria-checked={on} style={{ position: 'relative', width: 32, height: 18, flex: 'none', borderRadius: 999, background: on ? 'var(--action-primary)' : 'var(--gw-stone-300)', transition: 'background var(--duration-base) var(--ease-standard)' }}>
      <span style={{ position: 'absolute', top: 2, left: on ? 16 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', boxShadow: 'var(--shadow-sm)', transition: 'left var(--duration-base) var(--ease-standard)' }} />
    </span>
    {label}
  </label>;
}
