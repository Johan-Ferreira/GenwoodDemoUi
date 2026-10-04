# Story 3: Shared loading, error and message patterns

**Slug:** story-3-loading-error-message-patterns
**Requirement IDs:** R7, R8, R9, R10, R11, R12, R16, BR6, BR7
**Roles:** Demo presenter
**Route:** null
**Target file:** web/src/components/data-state/DataState.tsx
**Page action:** create_new
**Infrastructure only:** true

## Plain summary

Under the hood, every screen gets the same calm handling for slow loads, service errors with a Retry button, not-authorised messages, short confirmation messages at the bottom right, status labels that don't rely on colour, and spoken labels on icon-only buttons. You'll first see these on Overview and the other views as their epics land.

## Summary

Builds the shared building blocks the view epics will use. A data-state wrapper (hook + component) applies the loading thresholds (nothing for 300 ms, a Shadcn Skeleton up to 3 s, then the skeleton plus a "taking longer than usual" line), a persistent service-error message with Retry, an in-page not-authorised message and an empty state. Restyles and retimes the existing toast: bottom-right at 24px, Forest 900, white 14px text, 380px maximum width, auto-dismissing at about 2.6 s, with a persistent variant for states that need the user to act. Adds a StatusChip (always a text label, tones success/warning/danger/info/neutral from tokens) and an IconButton that requires an accessible label. All copy follows the tone rules: says what happened then what to do, no exclamation marks, British spelling, sentence case. The not-authorised message names a path to request access; wording is a default to be confirmed (no contact is specified in the docs).

## Acceptance criteria

- **AC-1** (coverage: vitest): While data loads, nothing shows for the first 300 ms, then a skeleton shows. After 3 s the skeleton stays and a message says loading is taking longer than usual, and the content replaces it on arrival
- **AC-2** (coverage: vitest): A service error shows a persistent message saying what happened, with a Retry button. Choosing Retry runs the read again and the message goes away on success
- **AC-3** (coverage: vitest): A not-authorised refusal shows an in-page message saying the request was not authorised and how to request access
- **AC-4** (coverage: vitest): A completed-action message appears at the bottom right and disappears after about 2.6 s, while a message that needs the user to act stays until acted on
- **AC-5** (coverage: vitest): Status chips always show a text label, coloured by intent (success, warning, danger, info, neutral), so colour is never the only cue
- **AC-6** (coverage: vitest): Icon-only buttons are announced to screen readers by a text label

## Manual test checklist

(none — under-the-hood; verified by later stories and views)

## Additional technical checks

Count: 6

## Reuse notes

- A toast system already exists: web/src/contexts/ToastContext.tsx, web/src/components/toast/Toast.tsx and ToastContainer.tsx, mounted in app/layout.tsx. Restyle and retime it rather than adding a new toast library. TOAST_SETTINGS durations in constants.ts need to become about 2600 ms.
- Shadcn already present: button, card, input, label. Add skeleton, badge, tooltip via the Shadcn CLI.
