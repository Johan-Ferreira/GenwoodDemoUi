# Curve data journal

## Story 1: Rates by maturity for a curve and valuation date

- Curve data now shows rates by maturity. You pick a curve (the first in the catalogue is chosen by default) and a valuation date (it starts on the latest date with data). The table lists every maturity the service returns for that curve, with the matching rate, its source column, source row, and a link to the import that produced it. Rates and years show 4 decimal places.
- The valuation date field lists every date that has data, and the text under it names the earliest and latest dates. A date not written as YYYY-MM-DD shows 'Enter the observation date as YYYY-MM-DD.' and no rates are requested for it.
- When a date has no data, the table stays empty and the footer says 'No data imported', then 'Choose another valuation date or import a file.' It is not shown as an error. A curve with no data at all shows the same message.
- The footer under a loaded table says 'Valuation date {date}. Rates in percent.' The design's longer version, which names the source import file and when it was received, is left out because it would need an extra lookup for each date.

## Story 2: Filter the curve catalogue

- The Curve data view now has Family, Rate type and Segment filters above the Curve picker. Each starts at 'All' and they combine. If the curve you're viewing no longer matches, the first matching curve is picked and its rates load. If nothing matches, the Curve picker is disabled and a message reads 'No curves match these filters. Clear the filters to list every curve.' A single 'Clear filters' button shows whenever any filter is set.
- The filters work on the full list of curves that's already loaded, so changing a filter doesn't call the service again.
- The file log and the curve data view now share one filter-dropdown component, so the two views' filters look and behave the same.
