# Journal — file-log

## Story 1: File log table with paging
- File log now loads every file in one go and pages it in the browser, as decided at the stories approval. The live data service accepted a page size of 1000 and returned all 4 files it holds. The app asks for 500 at a time, and if the service ever returns fewer than its total it fetches the next pages and merges them, so a hidden limit can't drop files.
- The live service sends sizes with decimals (for example "105439.00"). These parse correctly and show as e.g. "103.0 KB".
- The paging controls (5/10/20/50 rows, default 20, Previous/Next) are a shared component, so Curve data and Workflow monitor can reuse them.
