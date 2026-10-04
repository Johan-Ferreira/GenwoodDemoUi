Data table for file logs and yield-curve data — sunken caps header, hairline row dividers, mono numerics.
```jsx
<Table columns={[{ key: 'file', header: 'File', mono: true }, { key: 'rows', header: 'Rows', align: 'right', mono: true }, { key: 'status', header: 'Status', render: s => <Badge tone="success">{s}</Badge> }]} rows={rows} onRowClick={open} />
```
Right-align numbers. Use `dense` for maturity grids, `stickyHeader` + `maxHeight` for long data.
