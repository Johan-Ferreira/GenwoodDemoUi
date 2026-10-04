# Story 4: Session time limit

**Slug:** story-4-session-time-limits
**Requirement IDs:** R13, R3, BR3
**Roles:** Demo presenter
**Route:** null
**Target file:** web/src/app/(app)/layout.tsx
**Page action:** modify_existing
**Infrastructure only:** true

## Plain summary

Under the hood, a signed-in session ends 8 hours after sign-in and returns the presenter to the sign-in screen. There is no idle sign-out and no idle warning, so a presenter who pauses to talk through a screen is never signed out mid-demo.

## Summary

**Changed at the stories approval:** the user chose to switch idle sign-out OFF (requirements R13 inferred 15 minutes idle with a 60-second warning; that is dropped). Only the 8-hour absolute limit remains. Adds a session-timer to the (app) layout that tracks sign-in time and, at 8 hours, ends the session and routes to /sign-in; the next sign-in lands on Overview. The limit is a named constant so it can be changed in one place. No idle tracking, no warning dialog.

## Acceptance criteria

- **AC-1** (coverage: vitest): Eight hours after sign-in the session ends and the app returns to the sign-in screen, even with continuous activity
- **AC-2** (coverage: vitest): After the session ends, signing in again lands on Overview
- **AC-3** (coverage: vitest): Leaving the app untouched for longer than 15 minutes does not sign the presenter out and shows no warning
- **AC-4** (coverage: vitest): The 8-hour limit is a single named setting, not a number scattered through the code

## Manual test checklist

(none — an 8-hour limit isn't practical to test by hand; verified by automated tests)

## Additional technical checks

Count: 2

## Reuse notes

- Builds on the session from story 1 (sign-in time is already recorded). Do not add idle tracking or a dialog.
