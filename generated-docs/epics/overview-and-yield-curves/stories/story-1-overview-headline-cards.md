# Story 1: Overview headline cards

**Route:** /overview · **Target file:** web/src/app/(app)/overview/page.tsx · **Page action:** modify_existing
**Roles:** Demo presenter · **Requirements:** R1, R2, R3, R4, BR1, BR3, BR4, NFR1, NFR2, NFR4, NFR5
**Infrastructure-only:** false

## Summary
Replaces the Overview placeholder page with the title, the subtitle and four stat cards, all fed by one GET /v1/overview call through getOverview() and the shared DataState / useDataState loading and error pattern (nothing for 300 ms, then a skeleton, then a slow message after 3 s, then a persistent error with Retry). ChangeBp is parsed with parseNullableNumber. Increases use the success tone and decreases the danger tone, with a U+2212 minus sign and 1 decimal. A null or absent ChangeBp shows no change line. A missing KeyRates item or an empty LatestValuationDate shows "No data" per the brief's empty-states table. Numbers and dates use the mono face with tabular figures.

## Plain summary
The Overview page opens with four cards: the latest valuation date, the 10Y nominal spot and 10Y implied inflation rates with their change against the prior day, and the number of files received. Each card still reads sensibly when the service has no rates yet.

## Acceptance criteria
- AC-1 [vitest]: The Latest valuation date card and the page subtitle show the ISO date from the service. When there is no date, the card reads "No data" with "No rates have been imported yet.", and the subtitle drops the date.
- AC-2 [vitest]: The 10Y nominal spot and 10Y implied inflation cards show the rate to 4 decimals with "%", and a change line such as "+2.1 bp vs prior day" or "−2.1 bp vs prior day". An increase uses the success tone and a decrease the danger tone, and the sign always appears in the text.
- AC-3 [vitest]: A headline rate with no prior day shows its value but no change line at all (no "0.0 bp", no dash).
- AC-4 [vitest]: A headline rate the service did not return keeps its card label and reads "No data", with no unit and no change line. The page never shows "NaN", "null" or invented zeros.
- AC-5 [vitest]: The Files received card shows the total, with "{n} failed, {m} current", or just "{m} current" when none have failed, in a neutral tone. It shows even when no rates exist.
- AC-6 [vitest]: If the overview cannot be loaded, a persistent message describes the service error and offers Retry. No cards with partial or invented values are shown, and Retry reloads the cards.

## Manual test checklist
- Open Overview → the subtitle and the Latest valuation date card show the latest date, or "No data" with "No rates have been imported yet." if nothing has been imported
- Look at the 10Y nominal spot and 10Y implied inflation cards → each shows a rate to 4 decimals with %, or "No data" with no % sign
- When two consecutive days are imported → each rate shows a line like "+2.1 bp vs prior day" (green) or "−2.1 bp vs prior day" (red)
- When only one day is imported → the rate shows with no change line underneath
- Look at Files received → it shows the total and "4 current" (or "{n} failed, {m} current" if any failed)
- Stop the data service and reload Overview → after a moment you see an error message with a Retry button. Start the service and click Retry → the cards appear

## Reuse notes
- getOverview() exists in web/src/lib/api/endpoints.ts; parseNullableNumber in web/src/lib/api/nullable-number.ts; DataState / useDataState / ServiceErrorMessage in web/src/components/data-state/; formatDecimal4 / RATE_DECIMALS in web/src/lib/curves/curve-format.ts; PageHeader in web/src/components/app-shell/PageHeader.tsx.

## Resolved design choices
- While the live service returns no headline rates / spot curves: show the calm empty messages ("No data", "No spot curves have been imported yet."); do not compute them from curve data.
