'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SIGN_IN_PATH } from '@/lib/navigation/nav-items';
import {
  isSessionExpired,
  msUntilSessionExpiry,
} from '@/lib/session/session-limits';

export interface SessionTimerProps {
  /** Epoch milliseconds of sign-in; a new value restarts the window. */
  signedInAt: number;
  /** Ends the session (called once, when the limit is reached). */
  onExpire: () => void;
}

/**
 * Ends the session at the absolute limit after sign-in and returns to plain
 * sign-in (no return-to address, so the next sign-in lands on Overview).
 * Renders nothing; tracks no activity and shows no warning.
 */
export function SessionTimer({ signedInAt, onExpire }: SessionTimerProps) {
  const router = useRouter();
  const onExpireRef = useRef(onExpire);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    let expired = false;

    const expire = () => {
      if (expired) return;
      expired = true;
      onExpireRef.current();
      router.replace(SIGN_IN_PATH);
    };

    if (isSessionExpired(signedInAt, Date.now())) {
      expire();
      return;
    }

    const timeoutId = window.setTimeout(
      expire,
      msUntilSessionExpiry(signedInAt, Date.now()),
    );

    // Timers can be paused while the computer sleeps; re-check when the tab
    // becomes visible again so an overdue session still ends.
    const onVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        isSessionExpired(signedInAt, Date.now())
      ) {
        expire();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      expired = true;
      window.clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [signedInAt, router]);

  return null;
}
