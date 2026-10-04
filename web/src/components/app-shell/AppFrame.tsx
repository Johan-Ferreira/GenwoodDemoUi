'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  readDemoSession,
  signOutDemo,
  useDemoSession,
} from '@/lib/session/demo-session';
import { SIGN_IN_PATH } from '@/lib/navigation/nav-items';
import { isSessionExpiredNow } from '@/lib/session/session-limits';
import { SessionTimer } from '@/components/session/SessionTimer';
import { AppHeader } from './AppHeader';
import { SideNav } from './SideNav';

/**
 * The signed-in frame around every view. With no demo session it renders nothing
 * and sends the visitor to sign-in (no return-to address, so the next sign-in
 * lands on Overview).
 */
export function AppFrame({ children }: { children: React.ReactNode }) {
  const session = useDemoSession();
  const router = useRouter();
  // A stored session past its time limit counts as signed out: the view must
  // not render (or fetch) before the timer gets a chance to end it.
  const expired = session !== null && isSessionExpiredNow(session.signedInAt);

  useEffect(() => {
    if (expired) {
      signOutDemo();
      router.replace(SIGN_IN_PATH);
      return;
    }
    // Read storage directly: during hydration the hook still reports the server
    // snapshot (signed out), which must not trigger a redirect on its own.
    if (!session && !readDemoSession()) {
      router.replace(SIGN_IN_PATH);
    }
  }, [session, expired, router]);

  useEffect(() => {
    // Back/forward cache restore after sign-out: re-check before showing the page.
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      const stored = readDemoSession();
      if (!stored || isSessionExpiredNow(stored.signedInAt)) {
        if (stored) signOutDemo();
        router.replace(SIGN_IN_PATH);
      }
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [router]);

  const handleSignOut = useCallback(() => {
    signOutDemo();
    router.replace(SIGN_IN_PATH);
  }, [router]);

  if (!session || expired) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <SessionTimer signedInAt={session.signedInAt} onExpire={signOutDemo} />
      <AppHeader displayName={session.displayName} onSignOut={handleSignOut} />
      <div className="flex flex-1">
        <SideNav />
        {/* Content sits left, right beside the side nav, and uses the full width
            (no centring, no max width) — a user decision over the design. */}
        <main className="min-w-0 flex-1">
          <div className="flex flex-col gap-5 px-6 py-7">{children}</div>
        </main>
      </div>
    </div>
  );
}
