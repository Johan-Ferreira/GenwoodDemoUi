# Journal — overview-and-yield-curves

## Story 1: Overview headline cards
- The Overview page now opens with four headline cards: latest valuation date, 10Y nominal spot, 10Y implied inflation and files received. All four come from a single call to the data service. When the service has no rates yet, each card says "No data" instead of showing a zero or a blank, and the page subtitle leaves out the date.

## Story 2: Overview spot curves chart and recent loads
- Added a chart library (Recharts, via the Shadcn chart component) and built one shared line chart that the Overview and both Yield curves views will use. It draws the curves in the design's colours, shows a tooltip with a vertical guide on hover, and includes a hidden text list of the series for screen readers.
- The Overview now shows the spot curves chart under the headline cards, and a Recent loads table of the five newest files. Clicking a row opens that file in the File log. Both come from the same single overview request.
- Added three colour tokens for the chart's grid lines, axis lines and axis labels, taken from the design's chart guidance.

## Story 3: Yield curves across dates
- Yield curves now shows the Across dates chart. You pick a long-end curve, and the valuation and comparison dates default to the curve's latest and previous dates with data. The comparison line is dashed. Clearing Compare with leaves one curve on the chart. A date with no imported rates is left out and named in the subtitle. A curve with no dates at all says "No data has been imported for {curve}." The Across dates / Across families buttons are in place, but Across families has no chart yet; that comes in the next story.

## Story 4: Yield curves across families
- Across families mode now works on Yield curves. The chart shows the Nominal, Real, Inflation and OIS curves that share the selected curve's rate type (spot or forward) and segment, for the chosen valuation date, in that order and named by family. The title is "Spot curves by family" or "Forward curves by family", and the subtitle is "{date}, long end". A family curve with no data for that date is left out and named in the subtitle instead. Compare with is hidden in this mode, and the curve, valuation date and comparison date are all kept when you switch back.

## Epic-end quality fixes
- The chart wrapper used to colour each line by writing a small style block into the page, and the security check flagged that as an XSS risk. It now passes the line colours straight to the chart's container, so nothing is injected. The charts look the same, and the security check now passes.
- Raised the per-test time limit for the automated tests from 5 s to 15 s: a slow typing test from the File log epic timed out when the machine was busy.
- Browser tests found the family chart's title appearing twice on the page (a hidden copy inside the chart image). The chart is now named from its visible heading instead, so the title appears once. All 7 browser checks pass.
