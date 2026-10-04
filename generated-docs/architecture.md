# Architecture & Reuse Registry
> One line per durable thing. Edit the line when it changes; delete it when the thing is gone.
> No story narrative, no dates, no rationale.

## Shared utilities & components
| Export | Location | Capability |
|---|---|---|
| `useDemoSession`, `readDemoSession`, `signInDemo`, `signOutDemo`, `DemoSession` | `web/src/lib/session/demo-session.ts` | Client-only demo session in sessionStorage (`displayName`, `signedInAt`, `lastActivityAt`); hook re-renders on sign-in/out |
| `NAV_GROUPS`, `isNavItemActive`, `OVERVIEW_PATH`, `SIGN_IN_PATH` | `web/src/lib/navigation/nav-items.ts` | The six destinations, their routes, icons and groups; active-item matching |
| `AppFrame` | `web/src/components/app-shell/AppFrame.tsx` | Signed-in frame (header, side nav, padded `<main>`); redirects to `/sign-in` with no session; mounted by `app/(app)/layout.tsx` |
| `AppHeader`, `SideNav`, `GenwoodLogo` | `web/src/components/app-shell/` | Forest header with Sign out; 232px nav with `aria-current="page"`; logo at 36px/52px (Forest surfaces only) |
| `PageHeader` | `web/src/components/app-shell/PageHeader.tsx` | A view's `<h1>` title with optional subtitle and right-aligned actions |
| `get`, `requestFromService` | `web/src/lib/api/client.ts` | Read-only (GET-only) data-service client via the same-origin proxy; query params (arrays repeat, `undefined` dropped); rejects with `ServiceError` |
| `downloadFile`, `filenameFromContentDisposition` | `web/src/lib/api/download.ts` | GET a binary/text file (xlsx, CSV) through the proxy and save it under the service's Content-Disposition filename |
| `ServiceError`, `isServiceError`, `serviceErrorFromResponse` | `web/src/lib/api/service-error.ts` | Typed failure `{ status, description, retryable, kind }`; 401/403 → `not-authorised` (not retryable); others → `service-error`; description carries the service's `Message`; status 0 = unreachable |
| `parseNullableNumber` | `web/src/lib/api/nullable-number.ts` | Nullable-text numbers (`SizeBytes`, `RecordsInserted`, `ChangeBp`) → finite number or `null` ("no value") |
| `QueryParams`, `ServiceErrorShape`, `ServiceErrorKind`, `ServiceMessage` | `web/src/types/api.ts` | Shared data-service API types |

## Conventions
- Signed-in views live under `web/src/app/(app)/<route>/page.tsx`; routes: `/overview`, `/file-log`, `/curve-data`, `/yield-curves`, `/workflow-monitor`, `/api-reference` (not `/api`). `/` redirects to `/overview`.
- Each view renders exactly one `<h1>` (via `PageHeader`); the frame owns the only `<main>`, `<header>` and `<nav>` landmarks.
- Colours come from tokens in `globals.css`: Genwood primitives `--gw-*`, Shadcn semantics, plus `brand*`, `selected*`, `border-subtle`, `chart-1..6`; layout sizes `--layout-*`; type tokens `text-page-title`, `text-overline`, `tracking-overline`. Light theme only.
- Data-service calls go to the browser-facing base `NEXT_PUBLIC_API_BASE_URL` (default `/curve-data`, `CURVE_DATA_PROXY_PATH` in `constants.ts`); `next.config.ts` rewrites `/curve-data/v1/:path*` to server-side `CURVE_DATA_SERVICE_URL` (default `http://localhost:10020/curve-data`). Never call the service address from the browser; never issue non-GET requests.
- Interactive controls use the `focus-ring` utility (white gap + Forest 400 ring); Shadcn `Button` already applies it.
- Fonts: IBM Plex Sans/Mono via `next/font/google` (self-hosted) exposed as `font-sans` / `font-mono`; `font-mono` gets tabular figures. Icons: `lucide-react` with `aria-hidden="true"` when decorative.

## Cross-epic debt
- Template `Toast` component still uses Tailwind palette utilities (`bg-white`, `text-gray-*`, `border-green-500`); restyle to Genwood tokens (toast: Forest 900, white text, bottom-right).
