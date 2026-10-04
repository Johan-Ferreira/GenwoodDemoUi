import React from 'react';
export function Tabs({ tabs = [], value, defaultValue, onChange, variant = 'line', style }) {
  const [inner, setInner] = React.useState(defaultValue !== undefined ? defaultValue : tabs[0] && tabs[0].id);
  const cur = value !== undefined ? value : inner;
  const pick = id => { setInner(id); onChange && onChange(id); };
  const seg = variant === 'segmented';
  return <div role="tablist" style={{ display: 'flex', gap: seg ? 2 : 24, borderBottom: seg ? 'none' : '1px solid var(--border-default)', background: seg ? 'var(--surface-sunken)' : 'transparent', padding: seg ? 3 : 0, borderRadius: seg ? 'var(--radius-sm)' : 0, width: seg ? 'fit-content' : undefined, ...style }}>
    {tabs.map(t => { const on = t.id === cur;
      return <button key={t.id} role="tab" aria-selected={on} onClick={() => pick(t.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: 0, cursor: 'pointer', font: 'var(--type-label)', fontSize: 13, whiteSpace: 'nowrap', flex: 'none',
        padding: seg ? '6px 12px' : '10px 0', marginBottom: seg ? 0 : -1, borderRadius: seg ? 3 : 0, color: on ? 'var(--fg-brand)' : 'var(--fg-3)',
        background: seg ? (on ? 'var(--surface-card)' : 'transparent') : 'transparent', boxShadow: seg && on ? 'var(--shadow-sm)' : 'none',
        borderBottom: seg ? 0 : '2px solid ' + (on ? 'var(--action-primary)' : 'transparent'), transition: 'color var(--duration-fast)' }}>
        {t.label}{t.count !== undefined && <span style={{ font: 'var(--type-data)', fontSize: 11, padding: '1px 6px', borderRadius: 999, background: on ? 'var(--surface-selected)' : 'var(--surface-sunken)', color: 'inherit' }}>{t.count}</span>}
      </button>; })}
  </div>;
}
