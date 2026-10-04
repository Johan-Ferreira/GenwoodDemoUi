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

## Story 3: Rates by date across a date range

- Added the 'By date' view to Curve data. You switch with a 'By maturity' / 'By date' pair of buttons. By date has From and To fields, which start at the first and last dates the curve has data for, and a Tenors field. Each field takes effect when you leave it or press Enter. The table shows one row per valuation date, newest first, and one column per maturity headed '{label} (%)'. Each rate goes under the column with its own maturity label, never by position, and a missing rate shows a dash.
- When the Tenors field is empty, the By date view uses the key maturities: 1Y, 2Y, 5Y, 10Y, 20Y, 30Y for long-end curves and 1M, 3M, 6M, 1Y, 2Y, 5Y for short-end curves. These are matched to the curve's own maturities by length in months, so a short-end curve that calls one year '12M' still gets that column.
- A date range with no data shows 'No data imported' with the hint 'Choose another date range or import a file.' instead of an error.

## Story 4: Export rates as CSV

- The Curve data page now has an Export CSV button next to the By maturity / By date switch. It downloads a real CSV file for the shown curve and valuation date. The service sends no filename, so the file is saved as '{curve code}-{date}.csv'. A 'CSV export prepared.' notice then appears briefly in the bottom-right. If the export fails, an error stays on screen with a Retry button and no confirmation is shown. The button can't be clicked in the By date view or while the valuation date isn't a valid YYYY-MM-DD date.

## Story 1 (manual-test fix): Valuation date picker

- The Valuation date dropdown only ever offered the latest date, because the browser filters its suggestions by what is already typed. It is now a calendar picker: the field can still be typed in as YYYY-MM-DD, and a calendar button next to it opens a month view limited to the curve's earliest and latest dates. Days with imported data are marked with a dot. Picking any day, with or without data, shows its rates straight away.
