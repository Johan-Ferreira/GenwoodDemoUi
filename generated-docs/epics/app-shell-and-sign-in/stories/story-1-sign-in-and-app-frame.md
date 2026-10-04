# Story 1: Sign in and the Genwood app frame

**Slug:** story-1-sign-in-and-app-frame
**Requirement IDs:** R1, R2, R3, R4, R14, R15, R16, R17, BR1, BR2, BR3, BR7
**Roles:** Demo presenter
**Route:** /sign-in
**Target file:** web/src/app/(app)/layout.tsx
**Page action:** create_new
**Infrastructure only:** false

## Plain summary

The presenter opens the app, sees the Genwood sign-in screen, chooses "Sign in with Genwood SSO" and lands on Overview inside the Genwood app frame, with the header, the six-item side navigation and a working "Sign out". While signed out, every page sends you back to sign-in.

## Summary

Replaces the template welcome page. Adds the Genwood palette tokens to globals.css, serves IBM Plex Sans and Mono locally, and bundles Lucide icons. Builds /sign-in (two-column layout from the digest, single button, disclaimer, no credential fields) and a client-only demo session (display name fixed to "Demo user", sign-in time, last-activity time). Creates the (app) route group whose layout renders the 56px Forest header (logo 36px, "Yield curve data", "Demo user", "Sign out") and the 232px sidebar (Overview; Data: File log, Curve data, Yield curves; Governance: Workflow monitor, API) with an active-item indicator. Adds placeholder pages for the six views, each showing only its title, for later epics to replace. The API view lives at `/api-reference` (not `/api`, which Next.js reserves). Signed-out visits to `/` or any view redirect to /sign-in. Sign-in and sign-out always go through Overview. The back button after sign-out must not show a cached protected page. No role gating anywhere. Desktop only (minimum width about 1280px) per the user's decision. Performance budgets (R14) and the browser baseline (R17) are measured at epic end against this shell.

## Acceptance criteria

- **AC-1** (coverage: playwright): The sign-in screen offers only "Sign in with Genwood SSO", shows the disclaimer "Demo only: no credentials are checked. You will be signed in as Demo user." and has no username or password fields. Choosing the button lands on Overview inside the app frame, with "Yield curve data", "Demo user" and "Sign out" in the header
- **AC-2** (coverage: playwright): The side navigation lists Overview, then File log, Curve data and Yield curves under "Data", then Workflow monitor and API under "Governance". Choosing an item opens that view in the content area and marks the item as active
- **AC-3** (coverage: playwright): Choosing "Sign out" returns to the sign-in screen, and signing in again lands on Overview rather than the last view used
- **AC-4** (coverage: playwright): While signed out, any protected address, including the app root, sends the user to the sign-in screen instead of a welcome page
- **AC-5** (coverage: playwright): After signing out, pressing the browser Back button returns the user to the sign-in screen, not the page they were on
- **AC-6** (coverage: playwright): The sign-in screen and the app frame pass an automated accessibility scan, including visible focus on the sign-in button, nav items and Sign out

## Manual test checklist

- Open the app while signed out → you land on the sign-in page, not a welcome page
- The sign-in page shows the Genwood logo on the dark green left panel, a single "Sign in with Genwood SSO" button and the demo disclaimer, with no username or password boxes
- Click "Sign in with Genwood SSO" → you see Overview inside the frame, and the dark green header shows the logo, "Yield curve data", "Demo user" and "Sign out"
- Click each of the six side-menu items → that view opens and its menu item is highlighted
- Go to Curve data, click "Sign out", then sign in again → you land on Overview, not Curve data
- Sign in, sign out, then press the browser Back button → you're sent to sign-in, not back into the app
- While signed out, type /file-log in the address bar → you land on the sign-in page

## Additional technical checks

Count: 1

## Reuse notes

- web/src/app/page.tsx is the template welcome page. Replace it with a redirect (project brief overrides template code).
- Root layout app/layout.tsx wraps ToastProvider. Keep it; put session provider inside the (app) route group so /sign-in stays outside the frame.
- Shadcn present: button, card, input, label. Add others via `(cd web && npx shadcn add <component> --yes)`.
- Fonts via next/font (self-hosted); icons via lucide-react.
- Back-button-after-sign-out: re-check session on pageshow or mark protected responses no-store.
- Logo: copy `documentation/Genwood Yield prototype/assets/genwood-logo.png` to web/public/; show only on Forest 800 (36px header, 52px sign-in), alt "Genwood".

## Design choices

- Desktop only, minimum width about 1280px (user decision at stories approval).
