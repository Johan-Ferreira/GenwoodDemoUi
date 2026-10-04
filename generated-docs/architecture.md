# Architecture & Reuse Registry
> One line per durable thing. Edit the line when it changes; delete it when the thing is gone.
> No story narrative, no dates, no rationale.

## Shared utilities & components
| Export | Location | Capability |
|---|---|---|
| `useDemoSession`, `readDemoSession`, `signInDemo`, `signOutDemo`, `DemoSession` | `web/src/lib/session/demo-session.ts` | Client-only demo session in sessionStorage (`displayName`, `signedInAt`, `lastActivityAt`); hook re-renders on sign-in/out |
| `NAV_GROUPS`, `isNavItemActive`, `OVERVIEW_PATH`, `SIGN_IN_PATH` | `web/src/lib/navigation/nav-items.ts` | The six destinations, their routes, icons and groups; active-item matching |
| `SESSION_ABSOLUTE_LIMIT_MS`, `isSessionExpired`, `msUntilSessionExpiry` | `web/src/lib/session/session-limits.ts` | The single 8-hour absolute session limit (no idle limit) and expiry checks |
| `SessionTimer` | `web/src/components/session/SessionTimer.tsx` | `<SessionTimer signedInAt onExpire />`: at the absolute limit calls `onExpire` then `router.replace('/sign-in')`; new `signedInAt` restarts; re-checks on tab visible; renders nothing |
| `AppFrame` | `web/src/components/app-shell/AppFrame.tsx` | Signed-in frame (header, side nav, padded `<main>`); redirects to `/sign-in` with no session; mounts `SessionTimer` (sign-out on expiry); mounted by `app/(app)/layout.tsx` |
| `AppHeader`, `SideNav`, `GenwoodLogo` | `web/src/components/app-shell/` | Forest header with Sign out; 232px nav with `aria-current="page"`; logo at 36px/52px (Forest surfaces only) |
| `PageHeader` | `web/src/components/app-shell/PageHeader.tsx` | A view's `<h1>` title with optional subtitle and right-aligned actions |
| `get`, `requestFromService` | `web/src/lib/api/client.ts` | Read-only (GET-only) data-service client via the same-origin proxy; query params (arrays repeat, `undefined` dropped); rejects with `ServiceError` |
| `downloadFile`, `filenameFromContentDisposition` | `web/src/lib/api/download.ts` | GET a binary/text file (xlsx, CSV) through the proxy and save it under the service's Content-Disposition filename |
| `ServiceError`, `isServiceError`, `serviceErrorFromResponse` | `web/src/lib/api/service-error.ts` | Typed failure `{ status, description, retryable, kind }`; 401/403 → `not-authorised` (not retryable); others → `service-error`; description carries the service's `Message`; status 0 = unreachable |
| `parseNullableNumber` | `web/src/lib/api/nullable-number.ts` | Nullable-text numbers (`SizeBytes`, `RecordsInserted`, `ChangeBp`) → finite number or `null` ("no value") |
| `DataState`, `ServiceErrorMessage`, `NotAuthorisedMessage` | `web/src/components/data-state/DataState.tsx` | `<DataState load={() => get<T>(...)}>{(data) => ...}</DataState>`: loading thresholds (nothing 300 ms → skeleton in `role="status"` "Loading" → + "taking longer than usual" at 3 s), persistent service-error alert with Retry, not-authorised alert with request-access path, optional `isEmpty`/`empty`, custom `skeleton` |
| `useDataState`, `toServiceErrorShape`, `DataLoadState` | `web/src/components/data-state/useDataState.ts` | Hook behind `DataState` (`{ state, retry }`); any rejection becomes a `ServiceErrorShape` |
| `ToastProvider`, `useToast`, `ToastContainer` | `web/src/contexts/ToastContext.tsx`, `web/src/components/toast/` | `showToast({ variant, title, message?, persistent? })`; bottom-right (`data-position`), Forest 900, max 380px; auto-dismiss 2600 ms (`TOAST_SETTINGS`); `persistent` stays until dismissed; mounted in `app/layout.tsx` |
| `StatusChip`, `StatusTone` | `web/src/components/status-chip/StatusChip.tsx` | Pill label with `tone` success/warning/danger/info/neutral (`data-tone`); text always shown |
| `IconButton` | `web/src/components/icon-button/IconButton.tsx` | Icon-only Shadcn button; required `label` → `aria-label` + `title`; ghost/icon by default |
| `LOADING_THRESHOLDS`, `TOAST_SETTINGS` | `web/src/lib/utils/constants.ts` | 300 ms / 3000 ms loading thresholds; toast duration and max visible |
| `QueryParams`, `ServiceErrorShape`, `ServiceErrorKind`, `ServiceMessage` | `web/src/types/api.ts` | Shared data-service API types |

## Conventions
- Signed-in views live under `web/src/app/(app)/<route>/page.tsx`; routes: `/overview`, `/file-log`, `/curve-data`, `/yield-curves`, `/workflow-monitor`, `/api-reference` (not `/api`). `/` redirects to `/overview`.
- Each view renders exactly one `<h1>` (via `PageHeader`); the frame owns the only `<main>`, `<header>` and `<nav>` landmarks.
- Colours come from tokens in `globals.css`: Genwood primitives `--gw-*`, Shadcn semantics, plus `brand*`, `selected*`, `border-subtle`, `chart-1..6`, status intents `{success,warning,danger,info,neutral}` / `-surface` / `-border`, `toast*`; layout sizes `--layout-*`; type tokens `text-page-title`, `text-overline`, `tracking-overline`. Light theme only.
- Data-service calls go to the browser-facing base `NEXT_PUBLIC_API_BASE_URL` (default `/curve-data`, `CURVE_DATA_PROXY_PATH` in `constants.ts`); `next.config.ts` rewrites `/curve-data/v1/:path*` to server-side `CURVE_DATA_SERVICE_URL` (default `http://localhost:10020/curve-data`). Never call the service address from the browser; never issue non-GET requests.
- Interactive controls use the `focus-ring` utility (white gap + Forest 400 ring); Shadcn `Button` already applies it.
- Fonts: IBM Plex Sans/Mono via `next/font/google` (self-hosted) exposed as `font-sans` / `font-mono`; `font-mono` gets tabular figures. Icons: `lucide-react` with `aria-hidden="true"` when decorative.
- Every read in a view goes through `DataState` (never a hand-rolled spinner or silent empty fallback); status labels use `StatusChip`; icon-only buttons use `IconButton`.
- Shadcn CLI output must import `cn` from `@/lib/utils` and `Slot` from `@radix-ui/react-slot`; the CLI currently emits `from "cn"` / `from "radix-ui"` and adds those packages — fix the imports and revert `package.json`.

## Cross-epic debt
