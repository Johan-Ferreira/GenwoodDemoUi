# Design Digest — Genwood Yield (yield curve data demo)

A demo browser app for the Genwood pensions organisation. It governs Bank of England yield curve files (nominal, real, implied inflation and OIS) from receipt to publication. The app has a demo SSO sign-in, then an app shell with six views: Overview dashboard, File log (with an inline file-detail panel and an Import dialog), Curve data tables, Yield curve charts, Workflow monitor (process instances and execution logs), and an illustrative API reference.

| Field | Value |
|---|---|
| Read from | `documentation/Genwood Yield prototype/Genwood Yield.dc.html` (screens, copy, behaviour and sample logic: the primary design); `documentation/Genwood Yield prototype/_ds/…/tokens/*.css` and `documentation/Genwood Design System/tokens/*.css` (identical copies: palette, type, spacing, effects); `documentation/Genwood Design System/readme.md` (visual and content guidelines); `documentation/Genwood Design System/components/**` (component look and behaviour); `documentation/Genwood Design System/ui_kits/genwood-app/*` (an earlier proposed click-through, read for context only); `documentation/Genwood Yield prototype/uploads/*.csv` (table schemas behind the screens). `support.js` and `_ds_bundle.js` are prototype runtime, not design content. |
| Artifact verdict | design. A readable HTML prototype with six app views plus a sign-in screen, backed by a complete token set and a written design system. |
| Interpreter confidence | high for screens, copy and palette. Medium for data shapes and behaviour, because the prototype generates synthetic rates and simulates imports. |
| Last updated | 2026-10-04T12:00:00Z |

---

## Your Decisions

<!--
THESE OVERRIDE EVERYTHING BELOW. Written and maintained by the ORCHESTRATOR only —
the interpreter carries this section through untouched, never edits or re-words it,
and never re-raises a question answered here.
-->

- **App shell content area — left-aligned, not centred, and not capped at 1280px** *(file-log, 2026-10-04)*
  The page content sits immediately to the right of the side menu and uses the available width, instead of being centred with a 1280px maximum width as the design's App shell describes.
- **File log table — fits without horizontal scrolling** *(file-log, 2026-10-04)*
  The table panel must be wide enough to show every column, including Status at the end, with no horizontal scrollbar at normal desktop widths.
- **Curve data — Valuation date is chosen with a date picker, not a dropdown list of dates** *(curve-data, 2026-10-04)*
  The list of available dates grows with every import, so it must not be a dropdown. The field stays typeable (YYYY-MM-DD) and opens a calendar; dates with data are marked, and the earliest and latest dates still bound the picker.
- **Overview spot curves chart — includes an OIS spot curve as a fourth series** *(overview-and-yield-curves, 2026-10-05)*
  The "Spot curves on latest valuation date" chart draws Nominal, Real, Inflation and OIS spot (series "OIS spot", fourth chart colour), instead of only the three the design shows. The subtitle reads "Nominal, real, implied inflation and OIS, long end", and a missing OIS curve is reported as "No data for OIS." like the other families.

---

## Screens

### App shell (all signed-in views)

- **Purpose:** The persistent frame around every signed-in view: brand header, side navigation and content area.
- **Layout:** A fixed 56px header in Forest 800 runs full width. On the left are the Genwood logo (36px high) and, after a thin white-alpha divider, the product label. On the right are the user name and a "Sign out" button (white-alpha fill, white text, 4px radius). Below the header, a 232px white sidebar with a right border sits next to the main content. Content is padded 28px top/bottom and 32px left/right, max width 1280px, with sections stacked at 20px gaps. A toast appears bottom-right (24px from the edges, Forest 900 background, white 14px text, 6px radius, shadow-md, max width 380px) and auto-dismisses after about 2.6 s. Desktop layout only: there are no responsive or mobile variants.
- **Fields:** none.
- **Validation:** none.
- **Navigation:** The side nav sets the active view: "Overview" → Overview; under section "Data": "File log" → File log, "Curve data" → Curve data, "Yield curves" → Yield curves; under section "Governance": "Workflow monitor" → Workflow monitor, "API" → API. "Sign out" → Sign in screen, and the next sign-in lands on Overview. Nav icons are `layout-dashboard`, `file-spreadsheet`, `table`, `chart-line`, `workflow` and `code` respectively.
- **Copy:** Header product label "Yield curve data". User name "Demo user". Button "Sign out". Nav section labels "Data" and "Governance" (rendered as uppercase overlines through CSS). Nav items "Overview", "File log", "Curve data", "Yield curves", "Workflow monitor", "API".

### Sign in

- **Purpose:** Entry screen. The user signs in through Genwood single sign-on. In the demo no credentials are checked.
- **Layout:** Two equal columns at full viewport height. The left panel is Forest 800 with white text and 48px padding, its contents spread top to bottom: the logo (52px high) at the top, a headline and supporting line in the middle (max width 440px), and a small footer note. The right panel centres a 360px-max column holding the "Sign in" heading, a subheading, a full-width large primary button with a `log-in` icon, and a small disclaimer.
- **Fields:** none. No username or password inputs.
- **Validation:** none.
- **Navigation:** "Sign in with Genwood SSO" → App shell, Overview view.
- **Copy:**
  - Left headline: "Yield curve data, governed from receipt to publication."
  - Left supporting line: "Bank of England nominal, real, inflation and OIS curves, with a full audit trail for every file."
  - Left footer: "Demonstration environment"
  - Heading: "Sign in"
  - Subheading: "Use your Genwood single sign-on account."
  - Button: "Sign in with Genwood SSO"
  - Disclaimer: "Demo only: no credentials are checked. You will be signed in as Demo user."

### Overview

- **Purpose:** At-a-glance dashboard for the latest valuation date: key rates, file counts, the spot curves, and the most recent loads.
- **Layout:** A page title with a subtitle line. Below it, a row of 4 equal stat cards. Below that, a full-width chart card showing three series (Nominal, Real, Inflation spot, long end, on the latest date), with x ticks 0, 5, 10, 15, 20, 25, 30, 35, 40, y values to 3 decimals and a chart height of 280px. At the bottom, a flush "Recent loads" table card showing the 5 most recent files, newest first, with the same columns as the File log.
- **Fields:** none.
- **Validation:** none.
- **Navigation:** Clicking a "Recent loads" row → File log with that file selected (its detail panel open).
- **Copy:**
  - Title "Overview". Subtitle: "Latest valuation date {date}. Source: Bank of England, daily estimated UK yield curves."
  - Stat 1 label "Latest valuation date", value is the ISO date.
  - Stat 2 label "10Y nominal spot", value to 4 decimals, unit "%", delta formatted "+2.1 bp vs prior day" or "−2.1 bp vs prior day" (true minus sign U+2212, 1 decimal). The delta is moss/success when up and clay/danger when down.
  - Stat 3 label "10Y implied inflation", same value, unit and delta format as Stat 2.
  - Stat 4 label "Files received", value is the total file count. The delta line reads "{n} failed, {m} current", or "{m} current" when nothing has failed, in neutral tone.
  - Chart card title "Spot curves on latest valuation date", subtitle "Nominal, real and implied inflation, long end". Axis labels "Maturity (years)" and "Spot rate (%)". Series names "Nominal spot", "Real spot", "Inflation spot".
  - Table card title "Recent loads".

### File log

- **Purpose:** Every file received from the Bank of England with its import outcome. The user can filter by status, open a file's detail, and trigger an import.
- **Layout:** A header row holds the title and subtitle on the left, with a status Select (about 180px, no visible label) and a primary "Import file" button (`upload` icon) aligned to the right. Below it, a flush table card with a muted footer note. Rows are clickable. The selected row gets the Forest-50 fill and a 2px Forest inset bar on its left edge. When a row is selected, a **file detail card** appears below the table (see next entry). Rows are newest first.
- **Fields:** Status filter Select, options verbatim: "All statuses" (default), "Imported", "Failed", "Processing".
- **Validation:** none.
- **Navigation:** Row click → selects the file and shows its detail card. "Import file" → Import file dialog.
- **Copy:**
  - Title "File log". Subtitle "Every file received from the Bank of England, with its import outcome."
  - Table columns, in order: "ID" (mono, muted, 56px), "File" (mono), "Curve family", "Received" (mono, `YYYY-MM-DD HH:MM:SS`), "Size" (right, mono, e.g. "238.8 KB"), "Records inserted" (right, mono), "WOID" (mono, muted, first 8 hex chars), "Status" (badge).
  - Status badges: "Imported" uses the success/moss tone, "Failed" danger/clay, and "Processing" info/slate.
  - Card footer: "Source: Bank of England yield curves, picked up from the Inbox folder."
  - Empty-state copy for a filter with no matches is not designed. The design-system guideline example is "No files match these filters." (see Uncertainties).

### File log — file detail panel

- **Purpose:** Audit detail for one file-log entry, with links to its workflow run and its data.
- **Layout:** A card below the File log table. If the import failed, a danger alert box (clay-100 background, clay-300 border, clay-700 text, 6px radius) sits at the top. Below it is a 2-column key/value grid where each row has a muted 150px key and a monospace 12px value, with hairline separators. A row of buttons sits at the bottom.
- **Fields:** none.
- **Validation:** none.
- **Navigation:** "Open workflow" (secondary, `workflow` icon) → Workflow monitor with this file's process instance selected. "View data" (secondary, `table` icon) → Curve data with that family's long-end spot curve selected; it is **disabled** when the import failed or is still processing. "Download original" (ghost, `download` icon) → in the prototype this only shows a toast.
- **Copy:**
  - Card title is the file name. Subtitle "File log entry {id} · {status}", with " · current" appended when the file is the current version.
  - Error alert: first line (semibold) is the file's error message, e.g. "Sheet ‘4. spot curve’ not found in workbook." or "Row 14, column Years12: value -999 is outside the accepted range of -10 to 25 %." Second line: "Fix the source file or re-import once the Bank of England republishes it."
  - Key/value labels, in order: "WOID", "Workflow instance", "Received", "Size" (e.g. "244,580 bytes"), "Inbox location" (e.g. "C:/DigiataFiles/DigiataApps/ImportPro/Inbox/BankOfEngland/"), "Backup file" ("{woid}_{file name}"), "SHA-256" ("Not recorded" when absent), "Record count", "Records inserted", "Created by" (e.g. "System").
  - Buttons "Open workflow", "View data", "Download original".
  - Toast on download: "Original file downloaded from the Backup folder."

### Import file dialog

- **Purpose:** Simulates a Bank of England file arriving in the Inbox folder. The workflow then runs by itself.
- **Layout:** A modal dialog (10px radius, Forest-tinted scrim, shadow-lg) holding two stacked Selects and a footer with the buttons right-aligned.
- **Fields:**
  - Select label "Source file". Options: "GLC Nominal daily data current month.xlsx", "GLC Real daily data current month.xlsx", "GLC Inflation daily data current month.xlsx", "OIS daily data current month.xlsx". Default is the Nominal file.
  - Select label "File condition". Options: "Valid file" (default), "Faulty: sheet missing from workbook", "Faulty: rate outside accepted range". Hint: "Choose a faulty file to see the controlled failure path."
- **Validation:** none on the form. The failure scenarios produce these verbatim errors: missing sheet → "Sheet ‘4. spot curve’ not found in workbook." (faults at step 3, Validate workbook structure); out of range → "Row 14, column Years12: value -999 is outside the accepted range of -10 to 25 %." (faults at step 4, Validate values).
- **Navigation:** "Cancel" (secondary) closes the dialog. "Import file" (primary, `upload` icon) closes it and switches to File log with the new entry selected, the status filter reset to all, and the new row "Processing". About 2 s later the row resolves to Imported or Failed. A successful import marks earlier imports of the same file as not current.
- **Copy:** Title "Import file". Description "Simulates a file arriving in the Inbox folder. The workflow then runs on its own." Buttons "Cancel" and "Import file". Toasts: "File received. Workflow started." then "Import complete." or "Import failed. See the file log for details."

### Curve data

- **Purpose:** Published rates by curve, valuation date and maturity, in two table views, traceable to the source import.
- **Layout:** Title and subtitle at the top. Below them a filter row: a "Curve" Select (about 380px), a "Valuation date" date Input (monospace, about 170px), and, aligned to the right, a segmented pair of buttons ("By maturity" / "By date"; the active one is primary, the other secondary) followed by a secondary "Export CSV" button (`download` icon). Below that, a flush table card with a dense table, sticky header, max height 520px and scrolling, plus a muted footer.
  - **By maturity:** one row per tenor of the selected curve on the selected date.
  - **By date:** one row per valuation date (newest first) with key-tenor columns. The row for the selected date is highlighted.
- **Fields:**
  - Select label "Curve". Options are all 16 curve names (listed under Data Shapes), default "UK nominal spot curve".
  - Date input label "Valuation date", ISO date.
- **Validation:** none. When there is no data for the date, the table is empty and the footer explains why (copy below).
- **Navigation:** In By maturity, the "Source import (WOID)" cell is a link → File log with that source file selected. "By maturity" / "By date" switch views. "Export CSV" → in the prototype only a toast.
- **Copy:**
  - Title "Curve data". Subtitle "Published rates by curve, valuation date and maturity."
  - Buttons "By maturity", "By date", "Export CSV". Toast "CSV export prepared."
  - Card title is the curve name. Subtitle "{Family} · {spot|forward} · {long end|short end} · {Code}", e.g. "Nominal · spot · long end · GlcNominalSpotCurve".
  - By maturity columns: "Tenor" (mono), "Years" (mono, right, 4 dp), "Months" (mono, right), "Source column" (mono, muted, e.g. "Years10", "Months6"), "Rate (%)" (mono, right, bold, 4 dp), "Source row" (mono, muted, right), "Source import (WOID)" (mono link, first 8 chars).
  - By date columns: "Valuation date" (mono) then key tenors "{label} (%)" (mono, right, 4 dp). Long-end curves show 1Y, 2Y, 5Y, 10Y, 20Y, 30Y. Short-end curves show 1M, 3M, 6M, 1Y, 2Y, 5Y.
  - Footer with data, By maturity: "Valuation date {date}. Source import {id}: {file name}, received {timestamp}. Rates in percent." By date: the same without the leading "Valuation date {date}. " sentence.
  - Footer with no data for the date (By maturity): "No data has been imported for {curve name} on {date}. Choose another valuation date or import a file."
  - Footer with no current import for the family: "No current import for this curve family."

### Yield curves

- **Purpose:** Chart a curve and compare it across two dates, or compare the four curve families on one date.
- **Layout:** Title and subtitle at the top. Below them a filter row: a "Curve" Select (long-end curves only, about 380px), a "Valuation date" date Input, and, in Across dates mode only, a "Compare with" date Input. A segmented pair of buttons aligned right switches between "Across dates" and "Across families". Below that, a chart card (chart height 340px). In Across dates mode the comparison date is drawn dashed (1.5px, `4 3`). Series colours run in order chart-1 to chart-6. Hovering shows a vertical guide and a tooltip reading "{x} years" with one line per series.
- **Fields:**
  - Select label "Curve". Options are the 8 long-end curves only, default "UK nominal spot curve".
  - Date input label "Valuation date".
  - Date input label "Compare with" (Across dates only).
- **Validation:** none. Missing data is reported in the chart subtitle (copy below).
- **Navigation:** none beyond the mode switch.
- **Copy:**
  - Title "Yield curves". Subtitle "Compare a curve across dates, or curve families on one date."
  - Buttons "Across dates", "Across families".
  - Across dates: chart title is the curve name, subtitle "{date} compared with {compare date}", series named by date.
  - Across families: chart title "{Spot|Forward} curves by family", subtitle "{date}, long end" (or "short end"), series "Nominal", "Real", "Inflation", "OIS".
  - Missing data replaces the subtitle: "No data has been imported for {curve name} on {date}." or "… on {date} or {date}."
  - Axis labels "Maturity (years)" and "Spot rate (%)" or "Forward rate (%)" depending on curve type. X ticks are 0–40 in 5s for long-end curves and 0–5 for short-end curves.

### Workflow monitor

- **Purpose:** Trace each import's workflow instance from receipt to publication: the step pipeline and the execution log.
- **Layout:** Title and subtitle at the top. Below them, a flush "Process instances" table card with clickable, selectable rows, newest first. When an instance is selected, three things appear below:
  - A card with a 7-column grid of step tiles, one per pipeline step. Each tile shows "{n} · {STATE}" in an uppercase 11px semibold overline, then the step name in 13px semibold. Tiles are tinted by state: Done uses success/moss, Faulted danger/clay, Running info/slate, and Not run uses the sunken surface with stone-700 text and the default border.
  - A flush, dense "Execution log" table card.
  - A secondary "Open file log entry" button (`file-spreadsheet` icon).
- **Fields:** none.
- **Validation:** none.
- **Navigation:** Row click → selects the instance. "Open file log entry" → File log with the instance's file selected.
- **Copy:**
  - Title "Workflow monitor". Subtitle "Each import runs as a workflow instance. Select one to trace it from receipt to publication."
  - Table card title "Process instances". Columns: "Instance ID" (mono, muted, first 12 chars followed by "…"), "Process" (e.g. "BoE yield curve import"), "Context (WOID)" (mono, muted, 8 chars), "Created" (mono), "Last executed" (mono), "Last activity", "Status" (badge: "Finished" success, "Faulted" danger, "Running" info).
  - Steps card title is the process name. Subtitle "{instance id} · {status} · {file name}".
  - Step names, in order: "Receive file", "Register in file log", "Validate workbook structure", "Validate values", "Transform to tenor and rate", "Persist yield curve rates", "Publish to API". Step states: "Done", "Faulted", "Running", "Not run".
  - Log card title "Execution log", subtitle "From ProcessExecutionLogsView". Columns: "Timestamp" (mono, 170px), "Activity" (220px), "Event" (badge with the "Activity" prefix stripped: "Started" neutral, "Completed" success, "Faulted" danger; 120px), "Message" (wraps).
  - Completed-step messages in the prototype, verbatim templates: "File {name} received ({size} KB)"; "File log entry created; SHA-256 recorded; copy saved to Backup/BankOfEngland"; "Expected sheets and header row found; 26 source rows detected"; "26 rows checked; all rates within -10 to 25 %; 0 rows rejected"; "Mapped source columns to 260 tenors across 4 curves and 21 valuation dates"; "5,460 rates written under WOID {first 8}; prior versions closed"; "Curves published at /yield-curves/v1; run marked complete". A faulted step's message is the file's error text.
  - Button "Open file log entry".

### API

- **Purpose:** Shows actuarial-model consumers that the same governed data is available over an API. It is an illustrative contract for the demo.
- **Layout:** Title and subtitle at the top. Below them a filter row with a "Curve" Select (all 16 curves) and a "Valuation date" date Input. Below that, two columns (ratio 1 : 1.4, top-aligned): on the left an "Endpoints" flush table card, on the right an "Example request and response" card containing a monospace 12px pre block (sunken surface, default border, 6px radius, max height 420px, scrolls).
- **Fields:** "Curve" Select and "Valuation date" date Input, as on Curve data.
- **Validation:** none.
- **Navigation:** none.
- **Copy:**
  - Title "API". Subtitle "The same governed data is available to actuarial models. Illustrative contract for the demo; no authorisation required."
  - Endpoints card title "Endpoints". Columns "Method" (mono, 80px) and "Path" (mono). Rows: GET `/curves`; GET `/curves/{code}/tenors`; GET `/curves/{code}/rates`; GET `/imports/{woid}`.
  - Example card title "Example request and response". Subtitle "GET https://api.genwood-demo.example/yield-curves/v1/curves/{code}/rates?observationDate={date}".
  - Example response body shape: `{ curve: { code, name, family, rateType, rateUnit: "Percent" }, observationDate, source: { provider: "Bank of England", woid }, rates: [{ tenorLabel, tenorYears, rate }], count, note }`. The note reads "Sample of {n} of {total} tenors shown", or "No data has been imported for this curve and observation date" when there is no data. The sample tenors are 1Y, 5Y, 10Y, plus 3M for short-end curves.

---

## Palette & Typography

All values are verbatim from `tokens/colors.css`, which is identical in `documentation/Genwood Design System/tokens/` and the prototype's `_ds/…/tokens/`. The design-system readme states the brand is built from the logo's Forest and calls everything beyond the logo colours a "proposal".

| Token | Value | Where found |
|---|---|---|
| Primary (Forest 800: brand, header, primary action, selected text) | `#003926` | `tokens/colors.css` (`--gw-forest-800`, `--action-primary`, `--surface-brand`) |
| Primary hover (Forest 700) | `#0d4a34` | `tokens/colors.css` (`--action-primary-hover`) |
| Primary press / toast (Forest 900) | `#002a1c` | `tokens/colors.css` |
| Forest 950 / scrim base | `#001f15` (scrim `rgba(0,31,21,.45)`) | `tokens/colors.css` |
| Forest 600 (link, chart-1) | `#1f5e45` | `tokens/colors.css` |
| Forest 500 (focus border) | `#3a7559` | `tokens/colors.css` |
| Forest 400 / 300 / 200 / 100 / 50 | `#6a9580` / `#9cb8a8` / `#c8d8cd` / `#e3ece5` / `#f1f6f2` | `tokens/colors.css` |
| Leaf (logo mark only, never UI) | `#00d400` | `tokens/colors.css` |
| Moss 700 / 600 / 500 / 300 / 100 (success) | `#3f6b2a` / `#557f38` / `#6e9447` / `#a9c28a` / `#e6eedb` | `tokens/colors.css` |
| Ochre 700 / 600 / 500 / 300 / 100 (warning, chart-2) | `#7f5c1e` / `#9a7128` / `#b88a3e` / `#dcc08a` / `#f4ead5` | `tokens/colors.css` |
| Clay 700 / 600 / 500 / 300 / 100 (danger, chart-4) | `#86412d` / `#9e5238` / `#b56a4f` / `#dba792` / `#f5e3db` | `tokens/colors.css` |
| Slate 700 / 600 / 500 / 300 / 100 (info, chart-3) | `#344e5a` / `#45636f` / `#5b7a86` / `#a3b8c0` / `#e2eaed` | `tokens/colors.css` |
| Stone 950 / 900 / 800 / 700 / 600 / 500 / 400 | `#1a1d1a` / `#262a26` / `#383d38` / `#4f554f` / `#676d66` / `#868b83` / `#a7aaa1` | `tokens/colors.css` |
| Stone 300 / 200 / 150 / 100 / 50 / white | `#c9c9bf` / `#dedcd2` / `#e8e6dd` / `#f0eee7` / `#f7f6f1` / `#ffffff` | `tokens/colors.css` |
| Background (light): page | `#f7f6f1` (stone-50) | `--surface-page` |
| Card surface | `#ffffff` | `--surface-card` |
| Sunken / hover surface | `#f0eee7` (stone-100) | `--surface-sunken`, `--surface-hover` |
| Selected surface | `#f1f6f2` (forest-50) | `--surface-selected` |
| Text fg-1 / fg-2 / fg-3 / disabled | `#1a1d1a` / `#4f554f` / `#676d66` / `#a7aaa1` | `--fg-*` |
| Borders subtle / default / strong / focus | `#e8e6dd` / `#dedcd2` / `#c9c9bf` / `#3a7559` | `--border-*` |
| Background (dark) | none | No dark theme in the design |

Semantic mappings, verbatim from `colors.css`:

- **Status:** success = moss (fg 700, bg 100, border 300); warning = ochre (700/100/300); danger = clay (700/100/300); info = slate (700/100/300); neutral = stone (fg 700, bg 100, border 200).
- **Chart series (ordered):** chart-1 forest-600, chart-2 ochre-500, chart-3 slate-500, chart-4 clay-500, chart-5 moss-500, chart-6 stone-500. Grid stone-150, axis stone-300, labels stone-600.
- **Header-on-Forest accents:** the product label and sign-in supporting text use forest-200, the sign-in footer uses forest-300, and the header user name uses forest-100. The Sign out button uses `rgba(255,255,255,.12)`, or `.2` on hover.

Typography (`tokens/typography.css`):

- **Font (headings):** IBM Plex Sans, semibold (600). Fallback stack `"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif`.
- **Font (body):** IBM Plex Sans, regular, 14px base, line-height 1.5.
- **Font (data/monospace):** IBM Plex Mono with tabular figures for every number, date, file name, ID and hash. Fallback `"IBM Plex Mono",ui-monospace,"SFMono-Regular",Menlo,monospace`.
- **Scale:** 11 / 12 / 14 / 16 / 18 / 22 / 28 / 36 / 48 px. Page titles are 28px/600, card titles 16px/600 (h3), captions 12px, and overlines 11px/600 uppercase with 0.08em tracking (table headers use 0.04em). Stat values use 22px/500 mono in Forest 800.
- **Weights:** 300 / 400 / 500 / 600 / 700.
- **Spacing:** 0 / 2 / 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 px.
- **Radii:** 2px checkboxes, 4px controls/tags, 6px cards/toasts, 10px dialogs, pill (999px) for badges and switches.
- **Control heights:** 28 / 36 / 44 px.
- **Layout sizes:** sidebar 232px, header 56px, content max 1280px.
- **Shadows:** xs `0 1px 1px rgba(26,29,26,.05)`; sm `0 1px 2px rgba(26,29,26,.06),0 1px 1px rgba(26,29,26,.04)`; md `0 4px 12px -2px rgba(26,29,26,.08),0 2px 4px rgba(26,29,26,.04)`; lg `0 16px 40px -8px rgba(0,31,21,.18),0 4px 10px rgba(0,31,21,.06)`.
- **Focus ring:** `0 0 0 2px #ffffff, 0 0 0 4px forest-400`. Inputs use a Forest 500 border plus a 3px Forest-100 halo.
- **Motion:** 120 / 180 / 260 ms with `cubic-bezier(.2,0,0,1)` (exit `cubic-bezier(.4,0,1,1)`). Colour and position fades only.
- **Theme:** light only.
- **Visual rules from the readme:** flat backgrounds with no gradients, imagery or textures. Borders do most of the separation. Hovered table rows turn stone-50. Selected rows get the Forest-50 fill and a 2px Forest inset left bar. Disabled controls are 45% opacity with a not-allowed cursor. Press nudges the control down 1px. No saturated colours anywhere in the UI.
- **Content rules from the readme:** sentence case everywhere; British spelling; no emoji and no exclamation marks; buttons are verb-first and 1–3 words; yields shown as % to 3–4 decimals; changes in basis points; ISO dates in data; 24h times; errors say what happened, then what to do.

---

## Data Shapes

These are inferred from what the screens show, cross-checked against the CSV table exports in `documentation/Genwood Yield prototype/uploads/`. `documentation/CurveData.yaml` and `documentation/requirements.md` are specs outside the design. They were not read for this digest and should take precedence over anything below.

- **YieldCurve** (curve definition): id, code, name, curveFamily (Nominal | Real | Inflation | OIS), rateType (Spot | Forward), segment (Long | ShortEnd), rateUnit ("Percent"), provider ("Bank of England"). There are 16 curves, in this order:
  - Nominal: `GlcNominalSpotCurve` "UK nominal spot curve"; `GlcNominalSpotShortEnd` "UK nominal spot curve, short end"; `GlcNominalFwdCurve` "UK instantaneous nominal forward curve"; `GlcNominalFwdsShortEnd` "UK instantaneous nominal forward curve, short end".
  - Real: `GlcRealSpotCurve` "UK implied real spot curve"; `GlcRealSpotShortEnd` "UK implied real spot curve, short end"; `GlcRealFwdCurve` "UK instantaneous implied real forward curve"; `GlcRealFwdsShortEnd` "UK instantaneous implied forward real rates, short end".
  - Inflation: `GlcInflationSpotCurve` "UK implied inflation spot curve"; `GlcInflationSpotShortEnd` "UK implied inflation spot curve, short end"; `GlcInflationFwdCurve` "UK instantaneous implied inflation forward curve"; `GlcInflationFwdsShortEnd` "UK instantaneous implied forward inflation rates, short end".
  - OIS: `OisSpotCurve` "UK OIS spot curve"; `OisSpotShortEnd` "UK OIS spot curve, short end"; `OisFwdCurve` "UK instantaneous OIS forward curve"; `OisFwdsShortEnd` "UK instantaneous OIS forward curve, short end".
- **YieldCurveTenor:** id, yieldCurveId, sourceColumnName (e.g. `Years0_5`, `Years10`, `Months6`), tenorMonths, tenorYears, tenorLabel (e.g. "0.5Y", "1Y", "6M"). The prototype gives long-end curves half-year steps (spot 0.5–40Y, forward 0.5–30Y) and short-end curves monthly steps (1–60M). These counts are inferred (see Uncertainties).
- **YieldCurveRate:** id, yieldCurveTenorId, observationDate (valuation date), rate (percent, high precision), woid (source import), sourceRowId, lastChangedUserId, validFrom, validTo (bitemporal: "prior versions closed" on re-import).
- **WOD file log entry:** wodFileLogId, woid (32-hex), requestingWorkflowId, cfImportSettingId, cfFileSettingId, fileName, fileLocation (Inbox path), fileSize (bytes), fileContent, backUpFileName ("{woid}_{fileName}"), backupFileLocation, fileContentKey (SHA-256), recordCount, inProcessFileLocation, inProcessFileName, recordsInserted, exceptionNote (the error text), createUserId ("System"), lastChangedDate, isCurrent. The UI derives these fields from it:
  - status: Imported | Failed | Processing
  - curve family
- **Process instance:** processInstanceId, definitionId, processName ("BoE yield curve import"), contextId (= WOID), currentStatusId, currentStatus (Finished | Faulted | Running), createdAt, lastExecutedAt, finishedAt, cancelledAt, faultedAt, data, lastExecutedActivityId, lastExecutedActivityName.
- **Process execution log:** id, processInstanceId, activityId, activityName (one of the 7 steps), activityType, eventName (ActivityStarted | ActivityCompleted | ActivityFaulted), timestamp, message, source, data.
- **Overview aggregates** (derived): latest valuation date; the 10Y nominal spot and 10Y implied inflation spot on the latest date, with bp change vs the prior valuation date; files received count; failed count; current count.
- **User/session:** display name only ("Demo user").

---

## Assets

- `documentation/Genwood Yield prototype/assets/genwood-logo.png` (identical copies at `documentation/Genwood Design System/assets/genwood-logo.png` and `…/uploads/Genwood Logo.png`). The Genwood logo is a 208×83 opaque raster on a Forest background. The readme says to place it only on Forest 800 and not to recolour or stretch it. Shown at 52px high on Sign in and 36px high in the header, with alt text "Genwood".
- Icons: Lucide outline glyphs, referenced by name. Used names: `log-in`, `upload`, `download`, `workflow`, `table`, `file-spreadsheet`, `layout-dashboard`, `chart-line`, `code`. Sizes are 16 in buttons/tables and 18 in nav. The prototype hotlinks them from a CDN.
- Fonts: IBM Plex Sans and IBM Plex Mono, which the prototype loads from Google Fonts.
- `documentation/Genwood Yield prototype/uploads/*.csv`: header and sample rows for the YieldCurve, YieldCurveTenor, YieldCurveRate, WODFileLog, ProcessInstancesView and ProcessExecutionLogsView tables (data context, not UI assets).
- `documentation/Genwood Yield prototype/uploads/Genwood Demo Requirements.docx` (+ `.converted.md`): a requirements document shipped with the prototype (spec, not design).
- `.thumbnail` files and `thumbnail.html`: preview images of the prototype and design system (not app assets).

---

## Translate, Don't Copy

- **Synthetic data → real data.** Every rate, curve point, date list (September 2026 business days), 10Y stat and bp delta in the prototype comes from a formula, and the five file-log rows and their workflow logs are canned sample records. None of these values is real.
- **Simulated behaviour → real behaviour.** Several things are simulated rather than real, so what they should actually do is open:
  - The Import dialog fakes a file arrival with a timer and a chosen "File condition".
  - "Download original" and "Export CSV" only show toasts.
  - Sign-in checks no credentials.
- **Prototype-only example values must not ship as facts.** The API base URL `https://api.genwood-demo.example/yield-curves/v1`, the Inbox/Backup Windows paths, and hard-coded counts ("26" records, "5,460 rates", "260 tenors across 4 curves and 21 valuation dates") are illustrative.
- **Remote CDN icons and fonts → local assets.** The prototype loads Lucide icons from unpkg and IBM Plex from Google Fonts at runtime. The design depends on the glyphs and typefaces, not on those hosts.
- **Inline styles and design-system globals → tokens and Shadcn primitives.** The prototype styles everything inline and pulls components (Button, Card, Stat, Table, Select, Input, Dialog, SideNav, Badge, YieldCurveChart) from a global prototype bundle. The visual intent is captured in the token values and component descriptions above. The markup and bundle are not the implementation.
- **Templating constructs are prototype runtime.** The `{{ … }}` bindings, conditional/loop tags and the single-file component class mark where data and handlers belong. They carry no meaning of their own.

---

## Uncertainties

- **Two design artifacts disagree.** The Yield prototype (`Genwood Yield.dc.html`) is read here as the current design. The design system also ships an older "proposed" UI kit (`ui_kits/genwood-app/`) with a different structure, including:
  - a separate File detail page with breadcrumb, "Re-import", a Table/Chart toggle and "Open in Yield curves";
  - status tabs and KPI stats on the File log;
  - comparison of up to 5 dates on Yield curves;
  - a validation-warnings card.

  Confirm the prototype is the design to build and the UI kit is superseded.
- **Authentication.** The design shows a single "Sign in with Genwood SSO" button that checks no credentials and signs everyone in as "Demo user". Is this demo-only bypass the intended behaviour, or should real SSO (which provider?) sit behind it? Should the user name come from the identity?
- **Import mechanism.** The prototype simulates arrival via a "Source file" plus "File condition" picker. In the real app, should "Import file" upload an actual file, re-trigger a pickup from the Inbox, or keep the scenario simulator for demos?
- **"Download original" and "Export CSV"** only show toasts in the prototype. Should they deliver real files? What should the CSV contain (the current table view, all tenors, all dates)?
- **API screen.** Is `https://api.genwood-demo.example/yield-curves/v1` and the four endpoints a real contract the app should call, or display-only reference copy? The subtitle says "no authorisation required". Confirm.
- **Logo quality.** Only a small (208×83) opaque raster exists. The readme notes that an SVG and a transparent/reversed version are needed. Is one available?
- **Fonts and icons are substitutions.** The readme says no brand fonts or icon set were supplied, and IBM Plex and Lucide were chosen as proposals. Confirm they are acceptable as final.
- **Palette is a proposal.** Everything beyond the logo-derived Forest/Leaf colours is described as a proposal. Confirm the earthy palette is approved.
- **Valuation date input.** It is a free date input. The prototype only has data for September 2026 business days and otherwise shows the "No data has been imported…" message. Should the date picker be limited to dates that have data, or default to the latest available date?
- **Tenor grids.** The prototype assumes long-end spot curves run 0.5–40Y, long-end forwards 0.5–30Y and short-end curves 1–60 months. The CSV sample and the BoE files may differ (the file-log `FileContent` shows short-end years up to 5). Confirm against the real tenor data.
- **File log empty state.** No copy is designed for a status filter with no matches. The readme's example is "No files match these filters.", which is the likely candidate. Confirm.
- **Empty and loading states.** None are designed for Overview, Workflow monitor (no instance selected beyond the table) or the charts while data loads.
- **Internal names on screen.** The Execution log subtitle reads "From ProcessExecutionLogsView" (a database view name), and IDs and WOIDs are shown raw. Confirm users should see these.
- **Prototype inconsistency.** The sample faulted file fails at "Validate values" with the missing-sheet message, while the import simulator raises the missing-sheet error at "Validate workbook structure". The simulator mapping is presumably the intended one.
- **Responsive behaviour.** The layout is desktop-only, with a fixed 232px sidebar, a 4-column stat grid and a 7-column step grid. Is tablet/mobile support required?
- **"Current" semantics.** A file is "current" when it is the latest successful import for its family, and a newer successful import closes prior versions. Confirm this matches the backend's `IsCurrent` and `ValidFrom/ValidTo` behaviour.
