# Curve data journal

## Story 1: Rates by maturity for a curve and valuation date

- Curve data now shows rates by maturity. You pick a curve (the first in the catalogue is chosen by default) and a valuation date (it starts on the latest date with data). The table lists every maturity the service returns for that curve, with the matching rate, its source column, source row, and a link to the import that produced it. Rates and years show 4 decimal places.
- The valuation date field lists every date that has data, and the text under it names the earliest and latest dates. A date not written as YYYY-MM-DD shows 'Enter the observation date as YYYY-MM-DD.' and no rates are requested for it.
- When a date has no data, the table stays empty and the footer says 'No data imported', then 'Choose another valuation date or import a file.' It is not shown as an error. A curve with no data at all shows the same message.
- The footer under a loaded table says 'Valuation date {date}. Rates in percent.' The design's longer version, which names the source import file and when it was received, is left out because it would need an extra lookup for each date.
