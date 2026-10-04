# Genwood Design System

Genwood is a new pensions organisation. Its first product is a **demo browser app** that imports **yield curve market data from the Bank of England** (nominal, real and implied-inflation curves) and lets users:
- view the **file log** — every file received, its status, warnings and errors;
- view the **data inside each file** — spot rates by valuation date × maturity;
- view **yield curve graphs** and compare curves across dates.

Audience: pension fund analysts, actuaries and operations staff. The tone is professional, calm and trustworthy.

## Sources
- `uploads/Genwood Logo.png` (208×83 PNG, opaque Forest background) — the **only** brand material supplied. Copied to `assets/genwood-logo.png`.
- Brief: "pensions company… professional… neutral and earthy… no colours should be jarring."
- No codebase, Figma, fonts, icon set, copy deck or screenshots were provided. Everything beyond the logo colours is a **proposal** derived from the brief.

## Index
- `styles.css` — entry point (imports only). Link this one file.
- `tokens/` — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `effects.css`, `base.css`.
- `guidelines/` — foundation specimen cards (Colors, Type, Spacing, Brand).
- `components/` — React primitives (`core/`, `forms/`, `display/`, `navigation/`, `feedback/`, `charts/`), each with `.jsx`, `.d.ts`, `.prompt.md` and a card HTML.
- `ui_kits/genwood-app/` — click-through app: file log, file detail, curve data, yield curves, import dialog.
- `assets/` — `genwood-logo.png`.
- `thumbnail.html`, `SKILL.md`.

## Components
- **core/** — Icon, Button, IconButton
- **forms/** — Input, Select, Checkbox, Radio, RadioGroup, Switch
- **display/** — Card, Stat, Badge, Tag, Table
- **navigation/** — Tabs, SideNav
- **feedback/** — Dialog, Toast, Tooltip
- **charts/** — YieldCurveChart

### Intentional additions
No source component inventory existed, so a standard set was authored. Beyond it:
- **Icon** — wrapper for Lucide (CDN) so every glyph tints via currentColor.
- **Stat** — key-figure block (10Y yield, files today) — the app's dashboards need it.
- **Table** — file logs and maturity grids are the core of the product.
- **SideNav** — app navigation shell.
- **YieldCurveChart** — the product's primary visual.

## UI kits
- `ui_kits/genwood-app/index.html` — Genwood Yield app (proposed design; no existing UI to recreate).

---

## CONTENT FUNDAMENTALS
- **Voice:** calm, precise, plain English. Like a careful colleague in operations — never salesy, never jokey. Pensions are about trust; copy should reduce anxiety.
- **Person:** address the user as **you** sparingly; the system describes itself neutrally ("Import complete", not "We imported your file!"). Avoid "I".
- **Casing:** **Sentence case** everywhere — titles, buttons, tabs, menu items ("Import file", "Yield curves", "File log"). ALL CAPS only for small overline labels in table headers and Stat labels (via CSS, not typed).
- **Buttons:** verb first, 1–3 words: "Import file", "Re-import", "Export CSV", "Download original".
- **Numbers:** yields as % with 3–4 decimals (4.312%, 4.0127); changes in basis points ("+2.1 bp vs prior day"). Dates ISO in data (2026-10-01), friendly in prose ("Wed 1 Oct 2026"). Times 24h (07:42). British spelling (colour, normalise) — UK pensions context, BoE data.
- **Errors:** say what happened, then what to do. "Sheet ‘4. spot curve’ not found in workbook." → "Fix the source file or re-import once the Bank of England republishes it." No blame, no exclamation marks.
- **Empty states:** one factual line: "No files match these filters."
- **Emoji:** never. **Exclamation marks:** never.
- **Domain words:** nominal / real / implied inflation, spot / forward, maturity (years), valuation date, basis points, curve, file, import.

## VISUAL FOUNDATIONS
- **Colour:** built from the logo's deep **Forest #003926**. Forest is the brand and action colour (header, primary buttons, selected states, focus). The logo's bright **Leaf #00D400** is too loud for UI and is **reserved for the logo mark only**. Neutrals are **warm stone** greys (slightly yellow/green-tinted, never blue-grey). Earthy complements — **moss, ochre, clay, slate** — are muted mid-tones used for status and chart series. No saturated colours anywhere in UI.
- **Status mapping:** success = moss, warning = ochre, danger = clay (brick, not red), info = slate, neutral = stone. Always tinted bg + border + darker text — never solid bright fills.
- **Charts:** ordered series forest → ochre → slate → clay → moss → stone. 2px lines, round joins; comparison/prior data dashed 1.5px in a lighter tint. Gridlines stone-150, horizontal only.
- **Type:** IBM Plex Sans for UI (semibold headings, regular body, medium labels); **IBM Plex Mono with tabular figures for every number, date and file name**. Scale 11/12/14/16/18/22/28/36/48. Base body 14px — data-dense app.
- **Backgrounds:** flat. Page = stone-50 (warm off-white), cards = white. Brand header = solid Forest. No gradients, no imagery, no textures, no patterns. Photography isn't part of the app; if used in marketing, prefer warm, natural, softly-lit imagery (woodland, natural light) — low saturation.
- **Layout:** fixed 56px Forest header; 232px white sidebar; content padded 28/32px, max 1280px. Grid of 4 stat cards above a main card is the default dashboard rhythm. Spacing scale 2/4/8/12/16/20/24/32/40/48/64.
- **Cards:** white, 1px stone-200 border, **6px radius**, shadow-xs (barely there). Header row 14px/20px padding with a hairline divider; optional muted footer strip on stone-50 for source notes. Tables/charts sit flush.
- **Corner radii:** restrained — 2px checkboxes, 4px controls/tags, 6px cards/toasts, 10px dialogs, pill only for status badges and switches.
- **Borders:** do most of the separation work. Hairline stone-150 inside cards, stone-200 card edges, stone-300 control edges.
- **Shadows:** soft and low. xs/sm for cards & secondary buttons, md for toasts/tooltips/popovers, lg for dialogs (Forest-tinted). No inner shadows.
- **Hover:** subtle background shift (stone-100 on ghost/secondary, Forest 700 on primary); table rows → stone-50. No scaling, no colour jumps.
- **Press:** 1px downward nudge + darker fill (Forest 900). No shrink.
- **Focus:** Forest 500 border + 3px Forest-100 halo on inputs; 2px white + 2px Forest-400 ring elsewhere.
- **Selected:** Forest-50 fill with Forest text; selected table rows also get a 2px Forest inset bar on the left edge of the row (not a card accent).
- **Animation:** minimal and functional — 120–260ms, `cubic-bezier(.2,0,0,1)`, colour/position fades only. No bounces, no parallax, no decorative motion.
- **Transparency & blur:** only the dialog scrim (Forest 950 at 45%) and white-alpha fills on the Forest header. No backdrop blur.
- **Disabled:** 45% opacity, not-allowed cursor.

## ICONOGRAPHY
- No icon set was supplied. **Substitution: [Lucide](https://lucide.dev)** outline icons (2px stroke, rounded caps) loaded from `https://unpkg.com/lucide-static@0.469.0/icons/<name>.svg` and rendered through the `Icon` component via CSS mask so they inherit `currentColor`.
- Sizes: 14 inline/captions, 16 in buttons/inputs/tables, 18 in nav, 20+ for empty states.
- Colour: fg-3 stone for neutral, status fg colours for status icons, white on Forest.
- Common glyphs: `file-spreadsheet`, `history`, `table`, `chart-line`, `upload`, `download`, `rotate-ccw`, `refresh-cw`, `circle-check`, `triangle-alert`, `circle-x`, `info`, `landmark`, `search`, `calendar`, `bell`.
- No emoji, no unicode-character icons, no icon font. Arrows in copy use Lucide icons, not "→".

## Logo usage
- `assets/genwood-logo.png` is a small (208×83) opaque raster on Forest — **only place it on Forest 800**. Don't recolour, stretch or put it on light surfaces. A vector (SVG) and a transparent/reversed version are needed.

## Fonts
- **Substitution:** no brand fonts were supplied. IBM Plex Sans + IBM Plex Mono are loaded from Google Fonts (`tokens/fonts.css`). Swap in brand fonts by replacing that file with local `@font-face` rules.
