import React from 'react';
export function Table({ columns = [], rows = [], rowKey = 'id', onRowClick, selectedKey, dense, stickyHeader, maxHeight, style }) {
  const [hov, setHov] = React.useState(null);
  const pad = dense ? '7px 12px' : '11px 16px';
  return <div style={{ overflow: 'auto', maxHeight, minWidth: 0, ...style }}>
    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, font: 'var(--type-body)', fontSize: 13 }}>
      <thead><tr>{columns.map(c => <th key={c.key} style={{ textAlign: c.align || 'left', padding: dense ? '8px 12px' : '10px 16px', width: c.width, whiteSpace: 'nowrap',
        font: 'var(--type-overline)', letterSpacing: 'var(--tracking-wide)', textTransform: 'uppercase', color: 'var(--fg-3)', background: 'var(--surface-sunken)',
        borderBottom: '1px solid var(--border-default)', position: stickyHeader ? 'sticky' : undefined, top: 0, zIndex: 1 }}>{c.header}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => { const k = r[rowKey] !== undefined ? r[rowKey] : i; const sel = selectedKey === k;
        return <tr key={k} onClick={onRowClick ? () => onRowClick(r) : undefined} onMouseEnter={() => setHov(k)} onMouseLeave={() => setHov(null)}
          style={{ cursor: onRowClick ? 'pointer' : 'default', background: sel ? 'var(--surface-selected)' : hov === k && onRowClick ? 'var(--surface-page)' : 'var(--surface-card)' }}>
          {columns.map((c, ci) => <td key={c.key} style={{ padding: pad, textAlign: c.align || 'left', borderBottom: '1px solid var(--border-subtle)', color: c.muted ? 'var(--fg-3)' : 'var(--fg-1)', whiteSpace: c.wrap ? 'normal' : 'nowrap',
            fontFamily: c.mono ? 'var(--font-mono)' : undefined, fontSize: c.mono ? 12.5 : undefined, fontVariantNumeric: 'tabular-nums', boxShadow: sel && ci === 0 ? 'inset 2px 0 0 var(--action-primary)' : undefined }}>
            {c.render ? c.render(r[c.key], r) : r[c.key]}</td>)}
        </tr>; })}</tbody>
    </table>
  </div>;
}
