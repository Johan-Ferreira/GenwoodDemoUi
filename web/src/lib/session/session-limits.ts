/**
 * Session time limit (brief R13). Idle sign-out is switched off by user decision;
 * only the absolute limit after sign-in applies. Change the limit here only.
 */

/** A signed-in session ends this long after sign-in: 8 hours. */
export const SESSION_ABSOLUTE_LIMIT_MS = 8 * 60 * 60 * 1000;

/** True once `now` has reached `signedInAt + SESSION_ABSOLUTE_LIMIT_MS`. */
export function isSessionExpired(signedInAt: number, now: number): boolean {
  return now - signedInAt >= SESSION_ABSOLUTE_LIMIT_MS;
}

/** Milliseconds left before the session ends (never negative). */
export function msUntilSessionExpiry(signedInAt: number, now: number): number {
  return Math.max(0, signedInAt + SESSION_ABSOLUTE_LIMIT_MS - now);
}
