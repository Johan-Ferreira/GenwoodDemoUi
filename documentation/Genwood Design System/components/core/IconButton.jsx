import React from 'react';
import { Icon } from './Icon.jsx';
const SZ = { sm: 28, md: 36, lg: 44 };
export function IconButton({ icon, label, variant = 'ghost', size = 'md', onClick, disabled, active, style }) {
  const [hov, setHov] = React.useState(false);
  const d = SZ[size] || 36;
  const bg = variant === 'primary' ? (hov ? 'var(--action-primary-hover)' : 'var(--action-primary)')
    : variant === 'secondary' ? (hov ? 'var(--action-secondary-hover)' : 'var(--action-secondary)')
    : variant === 'onBrand' ? (hov || active ? 'rgba(255,255,255,.1)' : 'transparent')
    : (hov || active ? 'var(--surface-hover)' : 'transparent');
  const fg = variant === 'primary' || variant === 'onBrand' ? '#fff' : active ? 'var(--fg-brand)' : 'var(--fg-2)';
  return <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}
    onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
    style={{ width: d, height: d, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, color: fg, background: bg,
      border: variant === 'secondary' ? '1px solid var(--border-strong)' : '1px solid transparent', borderRadius: 'var(--radius-sm)',
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1, transition: 'background var(--duration-fast)', ...style }}>
    <Icon name={icon} size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
  </button>;
}
