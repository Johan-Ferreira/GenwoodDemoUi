/**
 * Story Metadata:
 * - Route: null (non-routable)
 * - Target File: web/src/components/data-state/DataState.tsx
 * - Page Action: create_new
 *
 * E2E spec for Epic app-shell-and-sign-in, Story 3: Shared loading, error and
 * message patterns. All ACs are covered by Vitest; browser coverage (including
 * the axe scan) comes from the view stories that render these building blocks.
 */
import { test } from '@playwright/test';

// Non-routable: shared data-state, toast, StatusChip and IconButton building blocks with no page of their own.
test('Epic app-shell-and-sign-in, Story 3: Shared loading, error and message patterns (deferred to consumer stories)', () => {
  test.fixme(); // skips at runtime; behaves consistently across Playwright
  // versions, unlike the declarative test.fixme('title', fn) form
});
