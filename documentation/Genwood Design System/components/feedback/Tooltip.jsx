import React from 'react';
export function Tooltip({ content, children, placement = 'top' }) {
  const [show, setShow] = React.useState(false);
  const pos = placement === 'bottom' ? { top: '100%', marginTop: 6 } : { bottom: '100%', marginBottom: 6 };
  return <span onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} onFocus={() => setShow(true)} onBlur={() => setShow(false)} style={{ position: 'relative', display: 'inline-flex' }}>
    {children}
    {show && <span role="tooltip" style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', ...pos, zIndex: 50, whiteSpace: 'nowrap', pointerEvents: 'none',
      padding: '6px 8px', borderRadius: 'var(--radius-sm)', background: 'var(--gw-forest-900)', color: '#fff', font: 'var(--type-caption)', boxShadow: 'var(--shadow-md)' }}>{content}</span>}
  </span>;
}
