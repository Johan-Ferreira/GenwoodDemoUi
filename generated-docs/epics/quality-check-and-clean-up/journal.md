# Journal — Quality check and clean-up

## Story 1: Plain-language identifiers on Overview, File log and Import trace

The File log and Overview tables no longer show a WOID column. The remaining columns after File have a bit more padding so they spread out instead of bunching to the right. In the file detail panel, "WOID" now reads "Staging instance ID" and "Workflow instance" now reads "Rate load instance ID". The import trace's File log entry panel no longer shows the WOID row. Its staging and rate load panels still show their Instance IDs.

## Story 2: Date pickers on the File log received-date filters

The File log's Received from and Received to filters now each have a calendar button. With no date chosen the calendar opens on the current month; once a date is chosen it opens on that date's month. Picking a day fills the box, filters the list straight away and closes the calendar. Typing a date and pressing Enter works as before.

## Story 3: Curve data import-trace links and Yield curves date filter spacing

On Curve data's By maturity table, the last column no longer shows the "Source import (WOID)" heading. Screen readers still announce it as "Source import". Each row's link now just says "View Import Trace" and opens the same import trace as before. On Yield curves, the "Dates with data…" note under Valuation date now wraps under its own field, so Compare with sits right beside it instead of being pushed away or onto a new line.

## Story 4: Workflow monitor run selection and exception note in Audit history

Clicking a run in the Workflow monitor now narrows the list to that run, the same as "Open workflow" from the File log. Clicking the same run again after "Show all process instances" narrows it again.

Audit history now shows an "Exception note" row for a staging (ImportFile) run that didn't finish successfully and whose file has a note. That covers a run that isn't Finished, a run with a fault time, or a run whose file failed at the ImportPro stage. Rate load runs, successful runs and files with no note look the same as before.

## Manual-test fix cycle 1

The By date From and To fields now each have a calendar button next to the typed entry, the same kind as the Valuation date field. The calendar opens on the date already in the field. It only offers the curve's own date range and marks the days that have imported data. Picking a day fills the field and updates the table exactly as typing it would.

The Yield curves "Dates with data" note now runs over three tidy lines: "Dates with data:", then the earliest date, then the latest date. A date is never cut in half across lines.

The Import trace subtitle now names the file instead of its long WOID code. Until the file is known it just ends at "...published data."

