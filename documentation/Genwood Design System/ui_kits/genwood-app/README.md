# Genwood Yield app — UI kit

Browser app for importing Bank of England yield curve files and inspecting them.

No product code or designs existed when this kit was made — these screens are a **proposed** design built from the Genwood design system, not a recreation of an existing UI.

Screens (click-through in `index.html`):
- **File log** (`FileLogScreen.jsx`) — KPI stats, status tabs, filters, file table. Click a row to open it.
- **File detail** (`FileDetailScreen.jsx`) — summary metadata, validation warnings/errors, file contents as table or chart, re-import.
- **Curve data** (`DataScreen.jsx`) — dense date × maturity grid.
- **Yield curves** (`CurvesScreen.jsx`) — curve type select, compare up to 5 dates, spot/forward toggle, hover readout.
- **Import dialog** (`ImportDialog.jsx`) — manual import; adds "Processing" rows then a success toast.

Shell: `AppShell.jsx` (Forest header with logo, SideNav, PageHeader). Mock data: `data.js` (synthetic, plausible shapes — not real BoE values).
