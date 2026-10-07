/**
 * Project-wide mock factory for row-level import errors returned by
 * `GET /v1/imports/{Woid}/messages` (operationId `ImportMessageGetList`).
 *
 * Shared by Vitest and Playwright — never re-define these shapes in a test.
 *
 * Import discipline: `import type` only, sibling factories by relative path.
 */
import type {
  ImportMessageRead,
  ImportMessageReadList,
} from '../../types/api-generated';

/** A single failed-row message with realistic canonical defaults. */
export function createImportMessage(
  overrides: Partial<ImportMessageRead> = {},
): ImportMessageRead {
  return {
    SourceRowNumber: 5,
    ObservationDate: '2026-09-30',
    Message: 'Rate value is not a valid number',
    ...overrides,
  };
}

/**
 * Canonical set of failed rows. Includes one row without an ObservationDate
 * (the API omits the field when the row has none) so the neutral placeholder
 * path is exercised.
 */
export function createImportMessages(): ImportMessageRead[] {
  return [
    createImportMessage({
      SourceRowNumber: 3,
      ObservationDate: '2026-09-30',
      Message: 'Tenor "13X" is not a recognised tenor',
    }),
    createImportMessage({
      SourceRowNumber: 7,
      ObservationDate: '2026-09-30',
      Message: 'Rate value is not a valid number',
    }),
    {
      SourceRowNumber: 12,
      Message: 'Observation date is missing',
    },
  ];
}

/**
 * List response envelope. Defaults to the canonical set; pass `[]` for an
 * import with no failed lines (the API returns an empty list, not a 404).
 */
export function createImportMessageList(
  messages: ImportMessageRead[] = createImportMessages(),
): ImportMessageReadList {
  return { ImportMessages: messages };
}
