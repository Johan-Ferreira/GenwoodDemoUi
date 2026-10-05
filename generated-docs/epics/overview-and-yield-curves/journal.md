# Journal — overview-and-yield-curves

## Story 1: Overview headline cards
- The Overview page now opens with four headline cards: latest valuation date, 10Y nominal spot, 10Y implied inflation and files received. All four come from a single call to the data service. When the service has no rates yet, each card says "No data" instead of showing a zero or a blank, and the page subtitle leaves out the date.

## Story 2: Overview spot curves chart and recent loads
- Added a chart library (Recharts, via the Shadcn chart component) and built one shared line chart that the Overview and both Yield curves views will use. It draws the curves in the design's colours, shows a tooltip with a vertical guide on hover, and includes a hidden text list of the series for screen readers.
- The Overview now shows the spot curves chart under the headline cards, and a Recent loads table of the five newest files. Clicking a row opens that file in the File log. Both come from the same single overview request.
- Added three colour tokens for the chart's grid lines, axis lines and axis labels, taken from the design's chart guidance.
