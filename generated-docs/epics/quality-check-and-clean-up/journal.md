# Journal — Quality check and clean-up

## Story 1: Plain-language identifiers on Overview, File log and Import trace

The File log and Overview tables no longer show a WOID column. The remaining columns after File have a bit more padding so they spread out instead of bunching to the right. In the file detail panel, "WOID" now reads "Staging instance ID" and "Workflow instance" now reads "Rate load instance ID". The import trace's File log entry panel no longer shows the WOID row. Its staging and rate load panels still show their Instance IDs.

## Story 2: Date pickers on the File log received-date filters

The File log's Received from and Received to filters now each have a calendar button. With no date chosen the calendar opens on the current month; once a date is chosen it opens on that date's month. Picking a day fills the box, filters the list straight away and closes the calendar. Typing a date and pressing Enter works as before.

## Story 3: Curve data import-trace links and Yield curves date filter spacing

On Curve data's By maturity table, the last column no longer shows the "Source import (WOID)" heading. Screen readers still announce it as "Source import". Each row's link now just says "View Import Trace" and opens the same import trace as before. On Yield curves, the "Dates with data…" note under Valuation date now wraps under its own field, so Compare with sits right beside it instead of being pushed away or onto a new line.

