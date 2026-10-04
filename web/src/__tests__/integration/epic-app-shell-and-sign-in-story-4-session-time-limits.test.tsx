/**
 * Story Metadata:
 * - Route: null (infrastructure only; mounted in the (app) layout)
 * - Target File: web/src/app/(app)/layout.tsx
 * - Page Action: modify_existing
 *
 * Tests for Epic app-shell-and-sign-in, Story 4: Session time limit.
 *
 * Idle sign-out and the idle warning are switched OFF (user decision at the
 * stories approval). Only the 8-hour absolute limit remains.
 *
 * Implementation contract these tests assume (will fail until implemented, TDD red):
 * - `web/src/lib/session/session-limits.ts` exports
 *     `SESSION_ABSOLUTE_LIMIT_MS` (the one named 8-hour setting) and
 *     `isSessionExpired(signedInAt: number, now: number): boolean`.
 * - `web/src/components/session/SessionTimer.tsx` exports a client component
 *     `SessionTimer({ signedInAt, onExpire })`. When `signedInAt +
 *     SESSION_ABSOLUTE_LIMIT_MS` is reached it calls `onExpire()` (ends the demo
 *     session) and then `router.replace('/sign-in')` with no return-to address,
 *     so the next sign-in lands on Overview. It renders no visible UI, tracks no
 *     activity, and shows no warning. A new `signedInAt` (a fresh sign-in)
 *     restarts the 8-hour window.
 * - The (app) layout mounts `<SessionTimer>` with the session's sign-in time and
 *   the session's sign-out action.
 * - `AppFrame` treats a stored session already past the limit as signed out: it
 *   renders nothing, ends the session and goes to `/sign-in`.
 *
 * Fake timers are used because the timer is component-local and the story has no
 * route of its own (orchestrator instruction). Accessibility is not asserted here.
 */
import { act, render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AppFrame } from '@/components/app-shell/AppFrame';
import { SessionTimer } from '@/components/session/SessionTimer';
import {
  readDemoSession,
  signInDemo,
  signOutDemo,
} from '@/lib/session/demo-session';
import {
  SESSION_ABSOLUTE_LIMIT_MS,
  isSessionExpired,
} from '@/lib/session/session-limits';

const { mockReplace, mockPush } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  mockPush: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
    refresh: vi.fn(),
  }),
  usePathname: () => '/curve-data',
  useSearchParams: () => new URLSearchParams(),
}));

const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;
const ONE_MINUTE_MS = 60 * 1000;
const SIGNED_IN_AT = new Date('2026-10-04T09:00:00Z').getTime();

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

/** Presenter activity: pointer movement, a key press and a click. */
function simulateActivity() {
  act(() => {
    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

describe('Session time limit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(SIGNED_IN_AT);
  });

  afterEach(() => {
    signOutDemo();
    vi.useRealTimers();
  });

  // AC-1
  it('ends the session and returns to sign-in 8 hours after sign-in, even with continuous activity', () => {
    const onExpire = vi.fn();
    render(<SessionTimer signedInAt={SIGNED_IN_AT} onExpire={onExpire} />);

    // Presenter is active every 10 minutes for just under 8 hours.
    const step = 10 * ONE_MINUTE_MS;
    for (let elapsed = 0; elapsed + step < EIGHT_HOURS_MS; elapsed += step) {
      advance(step);
      simulateActivity();
    }
    // Move to exactly one minute before the limit.
    advance(SIGNED_IN_AT + EIGHT_HOURS_MS - ONE_MINUTE_MS - Date.now());

    // One minute before the limit: still signed in despite the activity.
    expect(onExpire).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalledWith('/sign-in');

    advance(ONE_MINUTE_MS);

    expect(onExpire).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/sign-in');
  });

  // AC-2
  it('returns to plain sign-in with no return address, and a fresh sign-in gets a new 8-hour window', () => {
    const onExpire = vi.fn();
    const { rerender } = render(
      <SessionTimer signedInAt={SIGNED_IN_AT} onExpire={onExpire} />,
    );

    advance(EIGHT_HOURS_MS);

    // Redirect carries no return-to address (current view is /curve-data), so
    // the next sign-in goes to Overview rather than back to the last view.
    expect(mockReplace).toHaveBeenCalledWith('/sign-in');
    expect(mockReplace).not.toHaveBeenCalledWith(
      expect.stringContaining('curve-data'),
    );
    expect(mockPush).not.toHaveBeenCalledWith(
      expect.stringContaining('curve-data'),
    );

    // Presenter signs in again: the old limit must not end the new session.
    vi.clearAllMocks();
    const resignedInAt = Date.now();
    rerender(<SessionTimer signedInAt={resignedInAt} onExpire={onExpire} />);

    advance(EIGHT_HOURS_MS - ONE_MINUTE_MS);
    expect(onExpire).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalledWith('/sign-in');

    advance(ONE_MINUTE_MS);
    expect(mockReplace).toHaveBeenCalledWith('/sign-in');
  });

  // AC-3
  it('does not sign out or show a warning when the app is left untouched for more than 15 minutes', () => {
    const onExpire = vi.fn();
    render(<SessionTimer signedInAt={SIGNED_IN_AT} onExpire={onExpire} />);

    advance(16 * ONE_MINUTE_MS);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(
      screen.queryByText(/signed out|session.*(expire|end)|stay signed in/i),
    ).not.toBeInTheDocument();
    expect(onExpire).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalledWith('/sign-in');

    // Still untouched hours later, short of the absolute limit: nothing happens.
    advance(7 * 60 * ONE_MINUTE_MS);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(onExpire).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalledWith('/sign-in');
  });

  // AC-1 (code-review fix): a session already past its limit never shows the view
  it('sends a visitor whose stored session is older than 8 hours to sign-in without showing the view', () => {
    signInDemo(SIGNED_IN_AT);
    vi.setSystemTime(SIGNED_IN_AT + EIGHT_HOURS_MS + ONE_MINUTE_MS);

    render(
      <AppFrame>
        <p>Curve data view</p>
      </AppFrame>,
    );

    expect(screen.queryByText('Curve data view')).not.toBeInTheDocument();
    expect(mockReplace).toHaveBeenCalledWith('/sign-in');
    expect(readDemoSession()).toBeNull();
  });

  it('shows the view for a stored session still inside its 8 hours', () => {
    signInDemo(SIGNED_IN_AT);
    vi.setSystemTime(SIGNED_IN_AT + EIGHT_HOURS_MS - ONE_MINUTE_MS);

    render(
      <AppFrame>
        <p>Curve data view</p>
      </AppFrame>,
    );

    expect(screen.getByText('Curve data view')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalledWith('/sign-in');
  });

  // AC-4
  it('uses one named 8-hour setting for the expiry decision', () => {
    expect(SESSION_ABSOLUTE_LIMIT_MS).toBe(EIGHT_HOURS_MS);

    expect(
      isSessionExpired(
        SIGNED_IN_AT,
        SIGNED_IN_AT + SESSION_ABSOLUTE_LIMIT_MS - 1,
      ),
    ).toBe(false);
    expect(
      isSessionExpired(SIGNED_IN_AT, SIGNED_IN_AT + SESSION_ABSOLUTE_LIMIT_MS),
    ).toBe(true);
    expect(
      isSessionExpired(SIGNED_IN_AT, SIGNED_IN_AT + 15 * ONE_MINUTE_MS),
    ).toBe(false);
  });
});
