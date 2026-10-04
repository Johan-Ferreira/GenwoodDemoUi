White bordered container with optional header, actions and footer — the main grouping surface in Genwood. Stat is a key-figure block for use inside cards.
```jsx
<Card title="Nominal spot curve" subtitle="Bank of England · 1 Oct 2026" actions={<Button size="sm" variant="secondary">Export</Button>} footer="Source: GLC Nominal daily data">…</Card>
<Stat label="10Y nominal" value="4.312" unit="%" delta="+2.1 bp" tone="up" />
```
Use `flush` for tables/charts. 1px stone border, 6px radius, shadow-xs only.
