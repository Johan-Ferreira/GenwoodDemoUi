# Story 2: Overview spot curves chart and recent loads

**Route:** /overview · **Target file:** web/src/app/(app)/overview/page.tsx · **Page action:** modify_existing
**Roles:** Demo presenter · **Requirements:** R5, R6, BR2, BR3, BR4, BR5, NFR3, NFR4, NFR5
**Infrastructure-only:** false

## Summary
Adds the "Spot curves on latest valuation date" chart card (280px) built from SpotCurves. It introduces a shared, token-driven line-chart component (the Shadcn chart primitive on Recharts) that the Yield curves stories reuse. The component provides axis labels, 0–40 ticks in 5s (extended if the data goes further), a y axis to 3 decimals, chart-1..chart-3 series colours, a vertical guide with a "{x} years" tooltip, a legend and an accessible text summary of the series. It handles empty and partial families ("No spot curves have been imported yet." / "No data for {family}."). Adds the "Recent loads" card, which reuses the existing FileTable and StatusChip (five newest by ReceivedAt, with the empty state "No files have been received yet."). A row click navigates to /file-log?file=<Id>.

## Plain summary
The Overview shows the nominal, real and inflation spot curves for the latest valuation date on one chart, and lists the five most recent file loads. Clicking a load opens it in the File log.

## Acceptance criteria
- AC-1 [vitest]: The chart card titled "Spot curves on latest valuation date" (subtitle "Nominal, real, implied inflation and OIS, long end") draws the "Nominal spot", "Real spot", "Inflation spot" and "OIS spot" series with a legend, the axes "Maturity (years)" and "Spot rate (%)", and maturity ticks 0 to 40 in fives.
- AC-2 [vitest]: When no spot curves exist, the card keeps its title and shows only "No spot curves have been imported yet." (no empty axes). When some families are missing, the chart draws the rest and the subtitle adds "No data for {family}."
- AC-3 [playwright]: Hovering over the chart shows a vertical guide and a tooltip reading "{x} years" with one line per series.
- AC-4 [vitest]: Recent loads lists the five newest files, newest first, with the File log's columns and labelled status badges. With no files it reads "No files have been received yet."
- AC-5 [playwright]: Clicking a Recent loads row opens the File log with that file selected and its detail panel open.
- AC-6 [playwright]: The Overview page passes an automated accessibility scan, and the chart offers a text summary of its series.

## Manual test checklist
- Open Overview with spot curves imported → one chart shows Nominal spot, Real spot and Inflation spot in different colours, with a legend
- Hover across the chart → a vertical line follows the pointer and a tooltip shows "{x} years" and each series' rate
- With no spot curves imported → the chart card reads "No spot curves have been imported yet." and shows no empty axes
- Look at Recent loads → up to five files, newest first, with the same columns and status labels as the File log
- Click a row in Recent loads → the File log opens with that file's detail panel showing

## Reuse notes
- No chart library installed yet: add the Shadcn chart primitive ((cd web && npx shadcn add chart --yes)) and build ONE shared token-driven line-chart component reused by Stories 3 and 4. Series colours: --color-chart-1..6 in globals.css (no hex literals).
- Reuse FileTable (web/src/components/files/FileTable.tsx) and StatusChip (web/src/components/status-chip/). File selection is URL-driven: /file-log?file=<Id> (FILE_QUERY_PARAM in web/src/components/file-log/useSelectedFile.ts).

## Resolved design choices
- Empty data from the live service shows calm empty messages; no computing from curve data.

## Change after manual test (2026-10-05)
- The chart also draws an "OIS spot" series (fourth chart colour, after Inflation). When OIS has no points the subtitle adds "No data for OIS." like the other families. Recorded in the design digest's Your Decisions.
