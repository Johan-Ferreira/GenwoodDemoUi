import React from 'react';
import { Icon } from './Icon.jsx';
const SIZES = { sm: { h: 28, px: 10, fs: 12, ic: 14 }, md: { h: 36, px: 14, fs: 13, ic: 16 }, lg: { h: 44, px: 18, fs: 14, ic: 18 } };
const VARIANTS = {
  primary: { bg: 'var(--action-primary)', hov: 'var(--action-primary-hover)', fg: 'var(--fg-on-brand)', bd: 'var(--action-primary)' },
  secondary: { bg: 'var(--action-secondary)', hov: 'var(--action-secondary-hover)', fg: 'var(--fg-1)', bd: 'var(--border-strong)' },
  ghost: { bg: 'transparent', hov: 'var(--surface-hover)', fg: 'var(--fg-brand)', bd: 'transparent' },
  danger: { bg: 'var(--gw-clay-600)', hov: 'var(--gw-clay-700)', fg: '#fff', bd: 'var(--gw-clay-600)' },
};
export function Button({ variant = 'primary', size = 'md', icon, iconRight, disabled, fullWidth, onClick, type = 'button', children, style }) {
  const [hov, setHov] = React.useState(false);
  const [down, setDown] = React.useState(false);
  const s = SIZES[size] || SIZES.md, v = VARIANTS[variant] || VARIANTS.primary;
  return <button type={type} disabled={disabled} onClick={onClick}
    onMouseEnter={() => setHov(true)} onMouseLeave={() => { setHov(false); setDown(false); }}
    onMouseDown={() => setDown(true)} onMouseUp={() => setDown(false)}
    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: s.h, padding: '0 ' + s.px + 'px',
      width: fullWidth ? '100%' : undefined, font: 'var(--weight-medium) ' + s.fs + 'px/1 var(--font-sans)', color: v.fg,
      background: hov && !disabled ? v.hov : v.bg, border: '1px solid ' + v.bd, borderRadius: 'var(--radius-sm)',
      boxShadow: variant === 'secondary' ? 'var(--shadow-xs)' : 'none', cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.45 : 1, transform: down && !disabled ? 'translateY(1px)' : 'none', whiteSpace: 'nowrap',
      transition: 'background var(--duration-fast) var(--ease-standard)', ...style }}>
    {icon && <Icon name={icon} size={s.ic} />}{children !== undefined && children !== null && <span>{children}</span>}{iconRight && <Icon name={iconRight} size={s.ic} />}
  </button>;
}
