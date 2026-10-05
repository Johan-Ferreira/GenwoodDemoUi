# Story 3: Yield curves across dates

**Route:** /yield-curves · **Target file:** web/src/app/(app)/yield-curves/page.tsx · **Page action:** modify_existing
**Roles:** Demo presenter · **Requirements:** R7, R8, R10, BR2, BR3, BR4, NFR1, NFR2, NFR3, NFR4, NFR5
**Infrastructure-only:** false

## Summary
Replaces the Yield curves placeholder with the title, subtitle, filter row (CurveSelect limited to the 8 long-end curves, default "UK nominal spot curve"; Valuation date and Compare with fields reusing the Curve data date picker, typeable and with dates that have data marked), the Across dates / Across families toggle (Across dates active), and a 340px chart card using the shared chart from Story 2. Dates default from GET /v1/curves/{Code}/availability to the latest and previous available dates. The series come from GET /v1/curves/compare. The comparison series is dashed (1.5px, 4 3) and series are named by date. With no comparison date the chart shows one series (R7). Missing combinations, whether absent or carrying empty Points, are omitted and the subtitle switches to the "No data has been imported for …" copy. The y axis label follows the curve's rate type. Loading and error states use DataState.

## Plain summary
On Yield curves the presenter picks a long-end curve, a valuation date and a comparison date, and sees the curve on both dates on one chart, with the comparison drawn dashed. A date with no imported data is left out and named in the subtitle.

## Acceptance criteria
- AC-1 [vitest]: The Curve selector offers only the 8 long-end curves and defaults to "UK nominal spot curve". Valuation date defaults to the latest date with data and Compare with to the previous date with data.
- AC-2 [vitest]: The chart is titled with the curve name, subtitled "{date} compared with {compare date}", and shows one series per date named by date, with the comparison series dashed and both in the legend.
- AC-3 [vitest]: With no comparison date set, the chart shows the single curve for the valuation date.
- AC-4 [vitest]: A date without imported data is left out, and the subtitle reads "No data has been imported for {curve name} on {date}." (or "… on {date} or {date}."). When no series has data, the plot area shows only that line. When the curve has no dates at all, it reads "No data has been imported for {curve name}."
- AC-5 [playwright]: Choosing another curve, valuation date or comparison date redraws the chart for the new selection, with the axis label matching the curve's rate type.
- AC-6 [vitest]: If the chart data cannot be loaded, a persistent message describes the error and offers Retry.

## Manual test checklist
- Open Yield curves → Curve shows "UK nominal spot curve", and the two dates are filled with the latest and previous imported dates
- Look at the chart → the title is the curve name, the subtitle reads "{date} compared with {date}", and the comparison line is dashed
- Open the Curve list → only long-end curves are offered
- Pick a different curve or date → the chart redraws for your choice
- Clear Compare with → the chart shows a single curve for the valuation date
- Pick a comparison date with no import → that line disappears and the subtitle reads "No data has been imported for {curve name} on {date}."

## Reuse notes
- compareCurves(), getCurveAvailability(), getCurves() exist in web/src/lib/api/endpoints.ts. CurveSelect and ValuationDateField (web/src/components/curve-data/) plus lib/curves/curve-filters.ts: reuse, filter to long-end segment. Shared line-chart component comes from Story 2. DataState for loading/error.
