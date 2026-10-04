# Journal — app-shell-and-sign-in

## Story 1: Sign in and the Genwood app frame
- Built the sign-in screen and the Genwood app frame. Signing in with one click saves a "Demo user" session in the browser tab and opens Overview. Sign out clears the session and goes back to sign-in. Opening the app root or any view while signed out goes to sign-in, and so does pressing Back after signing out.
- Replaced the template's grey Shadcn theme with the Genwood palette (Forest, Moss, Ochre, Clay, Slate and Stone) and the IBM Plex fonts, and gave all buttons and nav links the Genwood focus ring.
- Added placeholder pages for the six views (Overview, File log, Curve data, Yield curves, Workflow monitor, API at /api-reference) that later epics will replace.

## Story 2: Live data connection and file downloads
- The app now reaches the yield-curve data service through its own address: the browser asks for /curve-data/v1/..., and the app forwards that to http://localhost:10020/curve-data behind the scenes. The old wrong address (localhost:8042) is gone from the settings files. Only the /v1 data paths are forwarded, so the Curve data screen's own address is never mistaken for a data request.
- The shared data layer can now only read from the service, never change it. It can download original spreadsheets and CSV exports under the name the service gives them, and it turns sizes, record counts and basis-point changes into numbers or a deliberate "no value". When a request fails, the result says what went wrong (including the service's own message), whether retrying could help, and whether it was a "not authorised" refusal.
