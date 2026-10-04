import { isServiceError } from '@/lib/api/service-error';

/** A read whose 404 is a specific "not found" outcome rather than a failure (BR6). */
export type Lookup<T> = { found: true; value: T } | { found: false };

/**
 * Runs `load`; a 404 becomes `{ found: false }`, every other failure is rethrown so
 * `DataState` shows the persistent error with Retry.
 */
export async function lookUp<T>(load: () => Promise<T>): Promise<Lookup<T>> {
  try {
    return { found: true, value: await load() };
  } catch (error) {
    if (isServiceError(error) && error.status === 404) return { found: false };
    throw error;
  }
}
