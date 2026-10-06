/**
 * Project-wide mock factory for the service's error body (`Message`), returned
 * with 404s such as `GET /v1/process-instances/{Id}` and `GET /v1/imports/{Woid}`.
 *
 * Import discipline: `import type` only, sibling factories by relative path.
 */
import type { Message } from '../../types/api-generated';

export const PROCESS_INSTANCE_NOT_FOUND = 'Process instance not found';
export const IMPORT_NOT_FOUND = 'Import not found';

export function createMessage(text: string): Message {
  return { Message: text };
}

/** 404 body for an unknown process instance Id. */
export function createProcessInstanceNotFound(): Message {
  return createMessage(PROCESS_INSTANCE_NOT_FOUND);
}

/** 404 body for an unknown import WOID. */
export function createImportNotFound(): Message {
  return createMessage(IMPORT_NOT_FOUND);
}
