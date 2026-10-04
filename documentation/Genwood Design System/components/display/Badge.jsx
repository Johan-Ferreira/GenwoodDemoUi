import React from 'react';
export function Badge({ tone = 'neutral', dot = true, children, style }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 22, padding: '0 8px', borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap',
    font: 'var(--weight-medium) 12px/1 var(--font-sans)', color: 'var(--status-' + tone + '-fg)', background: 'var(--status-' + tone + '-bg)', border: '1px solid var(--status-' + tone + '-border)', ...style }}>
    {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />}{children}
  </span>;
}
