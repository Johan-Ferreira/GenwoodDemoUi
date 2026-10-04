import React from 'react';
import { Icon } from '../core/Icon.jsx';
export function SideNav({ items = [], value, onChange, footer, style }) {
  const [hov, setHov] = React.useState(null);
  return <nav style={{ width: 'var(--sidebar-w)', flex: 'none', background: 'var(--surface-card)', borderRight: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', padding: '16px 12px', gap: 2, ...style }}>
    {items.map(it => it.section ? <div key={it.section} style={{ font: 'var(--type-overline)', letterSpacing: 'var(--tracking-caps)', textTransform: 'uppercase', color: 'var(--fg-3)', padding: '16px 10px 6px' }}>{it.section}</div> :
      <button key={it.id} onClick={() => onChange && onChange(it.id)} onMouseEnter={() => setHov(it.id)} onMouseLeave={() => setHov(null)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, height: 36, padding: '0 10px', border: 0, borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left', font: 'var(--type-label)', fontSize: 13,
          color: value === it.id ? 'var(--fg-brand)' : 'var(--fg-2)', background: value === it.id ? 'var(--surface-selected)' : hov === it.id ? 'var(--surface-hover)' : 'transparent', fontWeight: value === it.id ? 600 : 500 }}>
        {it.icon && <Icon name={it.icon} size={18} color={value === it.id ? 'var(--fg-brand)' : 'var(--fg-3)'} />}
        <span style={{ flex: 1 }}>{it.label}</span>
        {it.count !== undefined && <span style={{ font: 'var(--type-data)', fontSize: 11, color: 'var(--fg-3)' }}>{it.count}</span>}
      </button>)}
    {footer && <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>{footer}</div>}
  </nav>;
}
