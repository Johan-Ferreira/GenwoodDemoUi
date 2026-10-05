# Story 4: Yield curves across families

**Route:** /yield-curves · **Target file:** web/src/app/(app)/yield-curves/page.tsx · **Page action:** modify_existing
**Roles:** Demo presenter · **Requirements:** R9, R10, BR2, BR3, NFR1, NFR3, NFR4
**Infrastructure-only:** false

## Summary
Implements the Across families mode of the Yield curves toggle. It hides Compare with, resolves the four family curves (Nominal, Real, Inflation, OIS) from the GET /v1/curves catalogue that share the selected curve's RateType and Segment, fetches them for the single valuation date via compare, and draws them in the order chart-1..chart-4 with the series named by family. Title "{Spot|Forward} curves by family", subtitle "{date}, long end" (or "short end"), and y axis "Spot rate (%)" or "Forward rate (%)". Missing families are omitted and named in the subtitle. Switching modes keeps the curve and valuation date. The page gets one automated accessibility scan covering both modes.

## Plain summary
The presenter switches Yield curves to "Across families" and sees the Nominal, Real, Inflation and OIS curves for one valuation date together. Any family with no data for that date is left out and named.

## Acceptance criteria
- AC-1 [vitest]: In Across families the Compare with field is hidden, and the chart shows the Nominal, Real, Inflation and OIS curves that share the selected curve's rate type and segment, named by family in that order.
- AC-2 [vitest]: The chart is titled "Spot curves by family" or "Forward curves by family" and subtitled "{date}, long end", with the y axis "Spot rate (%)" or "Forward rate (%)" to match.
- AC-3 [vitest]: A family curve with no data on the chosen date is left out, and the subtitle reads "No data has been imported for {family curve name} on {date}."
- AC-4 [playwright]: Switching between Across dates and Across families keeps the chosen curve and valuation date and redraws the chart for that mode.
- AC-5 [playwright]: The Yield curves page passes an automated accessibility scan in both modes.

## Manual test checklist
- Click "Across families" → Compare with disappears and the chart shows Nominal, Real, Inflation and OIS lines with a legend
- With a spot curve selected → the title reads "Spot curves by family" and the subtitle "{date}, long end"
- Select a forward curve → the title changes to "Forward curves by family" and the axis to "Forward rate (%)"
- Pick a date where one family has no import → that line is missing and the subtitle names the missing curve
- Switch back to "Across dates" → your curve and valuation date are unchanged and the dated comparison returns

## Reuse notes
- Same endpoints, selectors and shared chart as Story 3.
