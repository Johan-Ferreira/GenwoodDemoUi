# Epic brief: App frame and sign-in

Inherits roles, auth, data source, compliance, and styling from project.md.

| Field | Value |
|---|---|
| Epic slug | `app-shell-and-sign-in` |
| Epic name | App frame and sign-in |

---

## Goal

The presenter signs in with one click, lands in the Genwood-branded app frame with all six menu items, can sign out, and every screen can read the live yield-curve data service with consistent loading, error and message handling.

This epic delivers the foundation every later screen builds on: the sign-in screen, the app frame (header and side navigation), the same-origin data access layer, and the shared feedback patterns (loading, errors, messages, status chips, accessibility labels). It does not build the content of the six views; those are separate epics.

---

## Data Model

Scoped to this epic. Authoritative sources: `documentation/CurveData.yaml` (OpenAPI 3.0.3) and `documentation/requirements.md`, which take precedence over the digest's inferred shapes.

- **Session (client-only):** display name ("Demo user"), signed-in flag, sign-in time, last-activity time. No credentials, no identity provider, no stored user record. The name is a fixed value, not read from an identity.
- **Service error (shown to the user):** HTTP status, a short plain-language description, and whether the failure is retryable. A 401/403 style response maps to the not-authorised message (R8); everything else maps to the persistent service-error message (R7).
- **Nullable-text fields from the service:** `SizeBytes`, `RecordsInserted` and `ChangeBp` arrive as nullable strings in the spec. The shared data access layer parses them into numbers or an explicit "no value" state, and never shows "null", "NaN" or an empty cell without intent. Later epics consume the parsed values.
- **Binary downloads:** the file-original (xlsx) and curve-rates (CSV) endpoints return binary or text bodies, not JSON. The shared layer exposes a download path that hands the browser a file with the service's filename.
- **Navigation model:** six destinations in two groups: Overview; Data (File log, Curve data, Yield curves); Governance (Workflow monitor, API).

---

## Functional Requirements

- **R1.** Sign in automatically as the demo presenter. The sign-in screen shows a single "Sign in with Genwood SSO" button and no credential fields. It shows the disclaimer "Demo only: no credentials are checked. You will be signed in as Demo user." Choosing the button signs the presenter in and lands on Overview. (requirements §6.6.1; design: Sign in)
- **R2.** The app frame has a brand header and side navigation. The Forest header shows the Genwood logo, the label "Yield curve data", the user name "Demo user" and a "Sign out" button. The side navigation lists Overview; under "Data": File log, Curve data, Yield curves; under "Governance": Workflow monitor, API. The active item is indicated, and each item opens its view inside the frame.
- **R3.** Sign out returns to the sign-in screen. The next sign-in lands on Overview, not on the view last used.
- **R4.** Every function is available to the signed-in presenter with no role restrictions. No screen, button or menu item is hidden or disabled because of a role. (BR-10, §6.5)
- **R5.** All data is read live from `http://localhost:10020/curve-data` at run time through a same-origin proxy, because the service sends no CORS header. The stale base URL in `web/.env.local` and `web/.env.example` (`http://localhost:8042`) is corrected to the live service address. (§1.6 C-024, NFR-base-6)
- **R6.** One shared data access layer serves all data reads and file downloads (xlsx and CSV). `SizeBytes`, `RecordsInserted` and `ChangeBp` arrive as nullable text and are handled explicitly (parsed, or shown as an intentional "no value").
- **R7.** When the service returns an error, the user sees a persistent message that says what happened and offers a retry. The message stays until the user retries or leaves. (§6.4.5, NFR-base-5)
- **R8.** When the service refuses a request as not authorised, an in-page message says the request was not authorised and names how to request access. (§6.4.5)
- **R9.** Loading is indicated by thresholds: nothing is shown for the first 300 ms, a skeleton is shown up to 3 s, and after 3 s the skeleton stays and a message says loading is taking longer than usual. (UI-17)
- **R10.** Completed actions show a short-lived message at the bottom right that disappears after about 2.6 s. States that need the user to act show a persistent message instead. (UI-18)
- **R11.** Status chips carry a text label, so the status is readable without colour. Colour follows intent (success, danger, info, neutral) and is never the only cue. (UI-14, §6.6.5)
- **R12.** Icon-only buttons carry a text label that screen readers announce. (§6.6.5)
- **R13.** Session limit: the session ends 8 hours after sign-in (absolute) and the app returns to sign-in. **Idle sign-out and the 60-second idle warning are switched OFF** (user decision at the stories approval, 2026-10-04, so a presenter pausing mid-demo is never signed out). (§6.6.1, inferred; see Notes & Caveats)
- **R14.** The app meets the page speed budgets: time to interactive at p95 of 3.0 s or less, initial bundle of 300 KB gzipped or less, time to meaningful content at p95 of 2.0 s or less, and a render of 200 table records in 500 ms or less at p95. (§6.6.2, NFR-base-2)
- **R15.** Genwood look and feel: the palette tokens from project.md live in `globals.css`, IBM Plex Sans and IBM Plex Mono are served locally (not from Google Fonts), icons are bundled Lucide icons (not from a CDN), and the theme is light only.
- **R16.** App messages use calm, plain wording: say what happened, then what to do. No blame, no exclamation marks, British spelling, sentence case. (§1.8)
- **R17.** The app meets WCAG 2.1 AA and the browser baseline (latest two versions of Chrome, Edge, Firefox, Safari). The design is desktop-only; whether tablet or mobile layouts are needed is confirmed at the stories approval.

---

## Business Rules

- **BR1.** There is one role, the demo presenter, and every function is available without restriction (requirements BR-10).
- **BR2.** Signing in checks no credentials and always signs in as "Demo user". It must not look like real authentication has taken place beyond the stated disclaimer.
- **BR3.** Sign-in always lands on Overview, including after sign-out.
- **BR4.** The browser never calls the data service directly; all calls go through the same-origin proxy and the shared client in `web/src/lib/api/client.ts` (or its download counterpart).
- **BR5.** The service is read-only. This app issues only GET requests to it.
- **BR6.** A service error is never dismissed silently or replaced with empty data. The actual cause (status and message) is reported to the user in plain words.
- **BR7.** Colours, fonts and spacing come from tokens in `globals.css`. No hex literals in components. Leaf green `#00d400` appears only in the logo, never in the UI.

---

## Key Workflows

**Sign in**
1. The presenter opens the app and sees the sign-in screen.
2. The presenter chooses "Sign in with Genwood SSO".
3. The app signs the presenter in as "Demo user" and shows Overview inside the app frame.

**Move around**
1. The presenter chooses an item in the side navigation.
2. The view opens in the content area and the nav item shows as active.

**Sign out**
1. The presenter chooses "Sign out" in the header.
2. The app returns to the sign-in screen.
3. The next sign-in lands on Overview.

**Service failure and retry**
1. A data read fails.
2. A persistent message says what happened and offers "Retry".
3. The presenter chooses "Retry" and the read runs again. On success the message goes away.

**Slow load**
1. A data read takes longer than 300 ms, so a skeleton appears.
2. After 3 s the skeleton stays and a message says loading is taking longer than usual.
3. The content replaces the skeleton when the data arrives.

**Session limit** *(idle sign-out switched off by user decision)*
1. The presenter can leave the app untouched for any length of time without being signed out.
2. Eight hours after sign-in the app ends the session and shows the sign-in screen.

---

## Feature NFRs

- **Accessibility:** WCAG 2.1 AA. Visible focus ring (Forest-400 ring with white gap), keyboard operation of sign-in, navigation, sign out and retry, sufficient contrast on the Forest header, and text labels on icon-only buttons. Status is never conveyed by colour alone.
- **Performance:** the budgets in R14. Fonts and icons are local so no third-party request blocks first render.
- **Resilience:** one consistent handling of loading, error, not-authorised and empty responses across all screens, built once in the shared layer.
- **Tone:** all app copy follows §1.8 (calm, precise, plain).
- **Look and feel:** the app frame matches the digest: 56px Forest header, 232px white sidebar with right border, content padded 28px/32px with a 1280px maximum width, toast at 24px from the bottom-right edge on Forest 900 with white text and a 380px maximum width.

---

## Out of Scope

- The content of the six views (Overview, File log, Curve data, Yield curves, Workflow monitor, API). They are separate epics; this epic only provides the frame they sit in.
- Real single sign-on, real authentication, roles, MFA, lockout messaging or re-authentication. None applies (requirements §6.6.1).
- Importing a source file from the application (out of scope in requirements §1.5; the prototype's Import dialog is a simulation).
- Dark theme and tablet or mobile layouts (design is desktop-only; see the open question in R17).
- Compliance obligations (none identified in project.md).
- Mock or sample-data fallbacks, except where a later epic decides otherwise. Live reads take precedence.

---

## Notes & Caveats

- **Idle sign-out could end a demo mid-way (R13).** The 15 minute idle and 8 hour absolute limits are inferred, not stated by the client. A presenter who pauses to talk through a screen for 15 minutes would be signed out in front of the audience. Confirm the values, or whether the limits should be longer or switched off for a demo, at the stories approval.
- **Stale base URL (R5).** `web/.env.local` and `web/.env.example` hold `NEXT_PUBLIC_API_BASE_URL=http://localhost:8042`. The correct address is `http://localhost:10020/curve-data`. Because the browser calls through a same-origin proxy (a Next.js rewrite), consider whether the browser-facing value should be the proxy path and the real address a server-side setting.
- **No CORS header from the service (NFR-base-6).** Browser calls from `localhost:3000` fail without the proxy. Smoke test status: verified (HTTP 200 on `GET /v1/overview`, see `generated-docs/specs/api-smoke-test.sh`).
- **Download endpoints are not JSON.** The existing API client is JSON-only, so file downloads (xlsx, CSV) need a dedicated path in the shared layer (R6). Later epics (File log "Download original", Curve data "Export CSV") reuse it.
- **Nullable text numbers (R6).** `SizeBytes`, `RecordsInserted` and `ChangeBp` are typed as nullable strings in the spec. Parse once in the shared layer so later screens do not each re-invent it.
- **Breakpoints (R17, NFR-base-3).** project.md lists mobile, tablet and desktop breakpoints, but the design is desktop-only (fixed 232px sidebar). Confirm at the stories approval whether anything below desktop is required.
- **Performance wording differs.** project.md NFR-base-2 states First Contentful Paint under 2.5 s on a mid-tier mobile network; requirements §6.6.2 states time to interactive of 3.0 s on a typical office connection. R14 uses the §6.6.2 budgets; confirm whether the mobile-network FCP target also applies given the app is desktop-only.
- **Do NOT carry forward from the prototype:** the simulated sign-in internals and inline styles; remote Lucide icons from unpkg and IBM Plex from Google Fonts (use local assets); hard-coded user name logic and example values such as the API base URL `https://api.genwood-demo.example/yield-curves/v1`; the global prototype component bundle (rebuild with Shadcn primitives and tokens).
- **Logo.** Only a 208x83 opaque raster on a Forest background exists. Place it only on Forest 800 (header at 36px high, sign-in at 52px high), do not recolour or stretch it, and use alt text "Genwood". A transparent or SVG version is not available.
- **Fonts and icons are proposals** in the design system. They are used here as the working choice; confirm they are acceptable as final.
- **Not-authorised path (R8).** The requirements say the message must "name a path to request access" but give no contact or link. The wording for how to request access is not specified; confirm the contact or path at the stories approval.
