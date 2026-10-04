Responsive SVG line chart of yield vs maturity with crosshair hover readout — the core visual of the Genwood app.
```jsx
<YieldCurveChart series={[{ name: 'Nominal spot', points: [[0.5,4.01],[1,3.95],[5,4.11],[10,4.31]] }, { name: 'Prior day', points: [...], dashed: true }]} />
```
Series colours follow --chart-1…6 (forest, ochre, slate, clay, moss, stone). Put inside a flush Card.
