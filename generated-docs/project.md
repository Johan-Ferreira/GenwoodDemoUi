# Genwood Yield Curve Data

A demo browser app for the Genwood pensions organisation that governs Bank of England yield curve files (nominal, real, implied inflation and OIS) from receipt to publication. It is used by a demo presenter to show the file log, curve data, charts, workflow monitor and API reference, backed by a read-only live data service.

| Field | Value |
|---|---|
| Project slug | `genwood-yield-curve-data` |
| Created | 2026-10-04T12:00:00Z |
| Intake source | docs (requirements.md, CurveData.yaml) + design (prototype and design system) |
| Backend connectivity | verified |

---

## Roles & Permissions

**Template:** `internal-tool` (adapted: requirements specify a single role, so no Admin/User split is recorded)

One role, **Demo presenter**, with full access to every view and action. There are no role restrictions.

| Permission | Demo presenter |
|---|---|
| View main dashboard (Overview) | ✓ |
| View file log and file detail | ✓ |
| Import file (as designed in the prototype) | ✓ |
| Download original file | ✓ |
| View curve data (by maturity / by date) | ✓ |
| Export CSV | ✓ |
| View yield curve charts | ✓ |
| View workflow monitor and execution logs | ✓ |
| View API reference | ✓ |

> Permissions extend during BUILD as new stories surface new actions. Additions land here via a project-change PR (section 6.1 of the epic-branch plan). Permission removals or role-set changes halt for user review.

---

## Authentication

| Field | Value |
|---|---|
| Method | `custom` |
| BFF login endpoint (if BFF) | n/a |
| BFF userinfo endpoint (if BFF) | n/a |
| BFF logout endpoint (if BFF) | n/a |
| Custom auth notes (if custom) | Per `documentation/requirements.md`: a sign-in screen exists and signs the demo presenter in automatically (as if SSO) without authenticating. No real authentication, no role restrictions, no MFA, no lockout. Single role: demo presenter with full access. The backend needs no credentials. The design shows a "Sign in with Genwood SSO" button, with the disclaimer "Demo only: no credentials are checked. You will be signed in as Demo user." and a header "Sign out" button that returns to the sign-in screen. |

> Auth method confirmed explicitly by the user per [authentication-intake.md](.claude/policies/authentication-intake.md).

---

## Data Source & Backend Integration

| Field | Value |
|---|---|
| Data source | `existing-api` |
| Backend status | `running` |
| Mock layer required | no |

### Backend connectivity

| Aspect | Value |
|---|---|
| Base URL | `http://localhost:10020/curve-data` (spec servers description gives the prefix `/curve-data`) |
| Auth scheme | none |
| Auth header | none |
| Auth value format | n/a |
| Credential env vars | none |
| Smoke-test endpoint | `GET /v1/overview` |
| Smoke-test mode | full |
| Smoke-test status | verified (HTTP 200) |
| Smoke-test verified at | 2026-10-04 |
| Smoke-test notes | Script: `generated-docs/specs/api-smoke-test.sh`, config: `generated-docs/specs/smoke-config.json`. The overview response returned empty arrays for KeyRates and SpotCurves; FileCounts were Total 4 / Current 4 / Failed 0. |
| CORS / proxy notes | The backend sends no `Access-Control-Allow-Origin` header, so browser calls from `localhost:3000` need a Next.js rewrite/proxy (or backend CORS). `web/.env.local` and `web/.env.example` hold a stale `NEXT_PUBLIC_API_BASE_URL=http://localhost:8042` and should become `http://localhost:10020/curve-data`. |

Client notes: the service is read-only (15 GET operations). The download endpoints return binary xlsx and CSV, which do not fit the JSON-only API client and need a dedicated download path. The spec types `SizeBytes`, `RecordsInserted` and `ChangeBp` as nullable strings, so the UI must parse and handle null explicitly.

### API specs

| Path | Source |
|---|---|
| `documentation/CurveData.yaml` | user-provided (OpenAPI 3.0.3) |

---

## Compliance

**Applicable domains:** None
**Region (if Personal data applies):** not applicable

### Compliance Requirements

No compliance domains were identified during intake screening.

---

## Styling & Branding

| Field | Value |
|---|---|
| Primary brand color | `#003926` (Forest 800: header, primary action, selected text) |
| Accent / secondary | `#1f5e45` (Forest 600: links, chart-1); chart series in order: `#1f5e45`, `#b88a3e`, `#5b7a86`, `#b56a4f`, `#6e9447`, `#676d66` |
| Background (light) | `#f7f6f1` (page); cards `#ffffff`; sunken/hover `#f0eee7`; selected `#f1f6f2` |
| Background (dark, if applicable) | none (no dark theme in the design) |
| Font family (headings) | IBM Plex Sans, semibold (600) |
| Font family (body) | IBM Plex Sans, 14px base; IBM Plex Mono with tabular figures for numbers, dates, IDs and hashes |
| Theme | light only |
| Source | design digest palette (`tokens/colors.css`, `tokens/typography.css`) |

Supporting values (raw hex, from the digest): Forest 700 `#0d4a34` (primary hover), Forest 900 `#002a1c` (press, toast), Forest 500 `#3a7559` (focus border), Forest 200 `#c8d8cd`, Forest 100 `#e3ece5`; status tones: success Moss 700/100/300 `#3f6b2a` / `#e6eedb` / `#a9c28a`, warning Ochre `#7f5c1e` / `#f4ead5` / `#dcc08a`, danger Clay `#86412d` / `#f5e3db` / `#dba792`, info Slate `#344e5a` / `#e2eaed` / `#a3b8c0`; text `#1a1d1a` / `#4f554f` / `#676d66`; borders `#e8e6dd` / `#dedcd2` / `#c9c9bf`. Leaf `#00d400` is for the logo mark only, never UI. The digest carries the full token set.

> Component-specific styling emerges during BUILD. This section captures palette intent and typography per [styling-centralisation.md](.claude/policies/styling-centralisation.md). The design system calls everything beyond the logo colours a "proposal"; fonts and Lucide icons are likewise proposals.

---

## Baseline NFRs

- **NFR-base-1:** Accessibility: WCAG 2.1 Level AA baseline
- **NFR-base-2:** Performance: First Contentful Paint < 2.5s on a mid-tier mobile network
- **NFR-base-3:** Responsive design: mobile (≥360px) / tablet (≥768px) / desktop (≥1280px) breakpoints. Note: the design is desktop-only (fixed 232px sidebar); whether tablet/mobile is required is an open question for the stories approval.
- **NFR-base-4:** Browser support: latest two versions of Chrome / Edge / Firefox / Safari
- **NFR-base-5:** Error UX: user-visible error states with retry affordance for all async operations
- **NFR-base-6:** Next.js rewrite proxy required (CORS headers absent on the backend at `http://localhost:10020`)

---

## Design Source

| Field | Value |
|---|---|
| Digest | `generated-docs/design/digest.md` |
| Palette source | `tokens/colors.css` in the design system and prototype (identical copies) |
| Read from | `documentation/Genwood Yield prototype/Genwood Yield.dc.html` (primary), design-system tokens, readme, components and UI kit (context only), prototype `uploads/*.csv` |
| Attached files | `genwood-logo.png` (208x83 opaque raster, Forest background); Lucide icons by name; IBM Plex Sans/Mono; CSV table exports (data context) |

### Screens

| Screen | Key details |
|---|---|
| App shell | 56px Forest header (logo, "Yield curve data", user name, Sign out), 232px sidebar with six nav items, toast bottom-right |
| Sign in | Two-column split; single "Sign in with Genwood SSO" button, no credential fields |
| Overview | 4 stat cards, spot-curves chart, "Recent loads" table of 5 files |
| File log | Status filter, "Import file" button, file table, inline file detail panel |
| File log: file detail panel | Audit key/value grid, failure alert, Open workflow / View data / Download original |
| Import file dialog | Source file and File condition selects; simulated arrival in the prototype |
| Curve data | Curve (16), valuation date, By maturity / By date views, Export CSV |
| Yield curves | Long-end curves, Across dates / Across families chart modes |
| Workflow monitor | Process instances table, 7-step pipeline tiles, execution log |
| API | Curve and date selects, endpoints table, example request/response |

> The app is rebuilt in our stack (Shadcn + design tokens) to match the design as described in the digest, not copied from source markup. Prototype constructs that must not carry forward (synthetic data, simulated imports and downloads, remote CDN icons/fonts, example API base URL and Windows paths, inline styles) are in the digest's "Translate, Don't Copy" section. `documentation/requirements.md` and `documentation/CurveData.yaml` take precedence over the digest's inferred data shapes.
