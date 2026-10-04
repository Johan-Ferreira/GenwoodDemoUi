import React from 'react';
import { Icon } from '../core/Icon.jsx';
export function Tag({ children, selected, onClick, onRemove, color, style }) {
  const [hov, setHov] = React.useState(false);
  return <span onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 26, padding: '0 10px', borderRadius: 'var(--radius-sm)', cursor: onClick ? 'pointer' : 'default', whiteSpace: 'nowrap',
      font: 'var(--type-label)', color: selected ? 'var(--fg-brand)' : 'var(--fg-2)', background: selected ? 'var(--surface-selected)' : hov && onClick ? 'var(--surface-hover)' : 'var(--surface-card)',
      border: '1px solid ' + (selected ? 'var(--gw-forest-300)' : 'var(--border-default)'), transition: 'background var(--duration-fast)', ...style }}>
    {color && <span style={{ width: 10, height: 2, background: color, borderRadius: 1 }} />}
    {children}
    {onRemove && <span role="button" aria-label="Remove" onClick={e => { e.stopPropagation(); onRemove(); }} style={{ display: 'inline-flex', cursor: 'pointer', marginRight: -4 }}><Icon name="x" size={12} /></span>}
  </span>;
}
