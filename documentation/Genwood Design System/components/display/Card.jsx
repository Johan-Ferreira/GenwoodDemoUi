import React from 'react';
export function Card({ title, subtitle, actions, footer, padding = 20, flush, children, style }) {
  const head = title || actions;
  return <section style={{ background: 'var(--surface-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-xs)', display: 'flex', flexDirection: 'column', minWidth: 0, ...style }}>
    {head && <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: '14px ' + padding + 'px', borderBottom: flush || children ? '1px solid var(--border-subtle)' : 'none' }}>
      <div style={{ flex: '1 1 200px', minWidth: 200 }}>
        {title && <h3 style={{ margin: 0, font: 'var(--type-h3)', color: 'var(--fg-1)' }}>{title}</h3>}
        {subtitle && <div style={{ font: 'var(--type-caption)', color: 'var(--fg-3)', marginTop: 2 }}>{subtitle}</div>}
      </div>
      {actions && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>{actions}</div>}
    </header>}
    {children && <div style={{ padding: flush ? 0 : padding, flex: 1, minWidth: 0 }}>{children}</div>}
    {footer && <footer style={{ padding: '12px ' + padding + 'px', borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-page)', borderRadius: '0 0 var(--radius-md) var(--radius-md)', font: 'var(--type-caption)', color: 'var(--fg-3)' }}>{footer}</footer>}
  </section>;
}
export function Stat({ label, value, delta, unit, tone }) {
  const col = tone === 'up' ? 'var(--status-success-fg)' : tone === 'down' ? 'var(--status-danger-fg)' : 'var(--fg-3)';
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
    <div style={{ font: 'var(--type-overline)', letterSpacing: 'var(--tracking-caps)', textTransform: 'uppercase', color: 'var(--fg-3)' }}>{label}</div>
    <div style={{ font: 'var(--type-data-lg)', color: 'var(--fg-brand)', fontVariantNumeric: 'tabular-nums' }}>{value}{unit && <span style={{ fontSize: 14, color: 'var(--fg-3)', marginLeft: 2 }}>{unit}</span>}</div>
    {delta && <div style={{ font: 'var(--type-data)', fontSize: 12, color: col }}>{delta}</div>}
  </div>;
}
