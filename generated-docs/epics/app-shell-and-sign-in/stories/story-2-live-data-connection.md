# Story 2: Live data connection and file downloads

**Slug:** story-2-live-data-connection
**Requirement IDs:** R5, R6, BR4, BR5, BR6
**Roles:** Demo presenter
**Route:** null
**Target file:** web/src/lib/api/client.ts
**Page action:** modify_existing
**Infrastructure only:** true

## Plain summary

Under the hood, the app connects to the live yield-curve data service through its own address, so every later screen can read live data and download files (spreadsheets and CSV). Sizes, record counts and basis-point changes are always shown as a number or a deliberate "no value".

## Summary

Adds a Next.js rewrite in next.config.ts from a same-origin path (`/curve-data/:path*`) to `http://localhost:10020/curve-data/:path*`. Corrects the stale `http://localhost:8042` in web/.env.local, web/.env.example and the constants.ts default, making the browser-facing value the proxy path and the real address a server-side setting. Narrows the data-service surface of client.ts to GET only (BR5). Adds a download helper beside the client for the binary xlsx and text/csv endpoints that saves the file under the service's filename. Adds one parser for nullable-text numbers (SizeBytes, RecordsInserted, ChangeBp) that returns a number or an explicit no-value state. Maps failures to a typed service error `{ status, description, retryable, kind: 'not-authorised' | 'service-error' }`, with 401/403 classed as not-authorised.

## Acceptance criteria

- **AC-1** (coverage: vitest): Every data read goes to the app's own same-origin proxy path, never straight to the data service address
- **AC-2** (coverage: vitest): The data-service functions only ever issue read (GET) requests
- **AC-3** (coverage: vitest): Size, records-inserted and change-in-bp values become numbers, or an explicit "no value" when they are null, empty or not numeric, and never surface as "null" or "NaN"
- **AC-4** (coverage: vitest): Downloading an original file or a CSV export saves a file named as the service names it
- **AC-5** (coverage: vitest): A failed request comes back as a service error with its status, a plain description and whether it can be retried, and a not-authorised refusal is told apart from other failures
- **AC-6** (coverage: none): The proxy forwards to the live service at http://localhost:10020/curve-data, and the stale address is gone from the env files

## Manual test checklist

(none — under-the-hood; verified by later stories and views)

## Additional technical checks

Count: 6

## Reuse notes

- web/src/lib/api/client.ts already wraps fetch with error handling and logging. Extend it rather than adding a second client. Download helper sits beside it in lib/api/ (the client is JSON-only).
- web/src/lib/utils/constants.ts defaults API_BASE_URL to http://localhost:8042. Change it with the env files.
- next.config.ts only sets output: 'standalone'. Add rewrites(). Keep the proxy path out of /api.
- Smoke-test artifact: generated-docs/specs/api-smoke-test.sh (service verified reachable, HTTP 200, no auth).
