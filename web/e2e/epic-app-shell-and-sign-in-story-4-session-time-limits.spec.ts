/**
 * Story Metadata:
 * - Route: null (non-routable)
 * - Target File: web/src/app/(app)/layout.tsx
 * - Page Action: modify_existing
 *
 * E2E spec for Epic app-shell-and-sign-in, Story 4: Session time limit.
 * Infrastructure-only story: AC-1..AC-4 are all tagged coverage: vitest. No AC is tagged
 * playwright, so this spec is a non-routable stub.
 */
import { test } from '@playwright/test';

test.describe('Epic app-shell-and-sign-in, Story 4: Session time limit', () => {
  test('session time limit has no page of its own to drive end-to-end', () => {
    // Non-routable: session-timer plumbing in the (app) layout; all ACs are covered in Vitest.
    test.fixme();
  });
});
