import React from 'react';
export function Radio({ label, checked, onChange, disabled, name, value }) {
  return <label onClick={() => !disabled && onChange && onChange(value)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1, font: 'var(--type-body)', color: 'var(--fg-1)', userSelect: 'none' }}>
    <span role="radio" aria-checked={!!checked} data-name={name} style={{ width: 16, height: 16, flex: 'none', borderRadius: '50%', background: 'var(--surface-card)',
      border: (checked ? 5 : 1) + 'px solid ' + (checked ? 'var(--action-primary)' : 'var(--border-strong)'), transition: 'border var(--duration-fast)' }} />
    {label}
  </label>;
}
export function RadioGroup({ options = [], value, onChange, name, direction = 'column' }) {
  const [inner, setInner] = React.useState(value !== undefined ? value : (options[0] && (options[0].value || options[0])));
  const cur = value !== undefined ? value : inner;
  const opts = options.map(o => typeof o === 'string' ? { value: o, label: o } : o);
  return <div role="radiogroup" style={{ display: 'flex', flexDirection: direction, gap: direction === 'row' ? 20 : 10 }}>
    {opts.map(o => <Radio key={o.value} name={name} value={o.value} label={o.label} disabled={o.disabled} checked={cur === o.value} onChange={v => { setInner(v); onChange && onChange(v); }} />)}
  </div>;
}
