/**
 * Story Metadata:
 * - Route: null (non-routable)
 * - Target File: web/src/lib/api/client.ts
 * - Page Action: modify_existing
 *
 * E2E spec for Epic app-shell-and-sign-in, Story 2: Live data connection and file downloads.
 * Infrastructure-only story: AC-1..AC-5 are covered in Vitest; AC-6 (proxy target / env cleanup)
 * is coverage: none. No AC is tagged playwright, so this spec is a non-routable stub.
 */
import { test } from '@playwright/test';

test.describe('Epic app-shell-and-sign-in, Story 2: Live data connection and file downloads', () => {
  test('live data connection has no page of its own to drive end-to-end', () => {
    // Non-routable: API client/proxy plumbing with no UI; exercised via later stories' screens.
    test.fixme();
  });
});
