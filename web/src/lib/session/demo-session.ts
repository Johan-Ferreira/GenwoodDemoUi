'use client';

/**
 * Client-only demo session (project.md §Authentication: custom, no credentials).
 *
 * Signing in checks nothing and always signs in as "Demo user". The session lives
 * in sessionStorage so it is shared by the sign-in page (outside the app frame) and
 * the (app) route group, and ends when the browser tab closes.
 */
import { useSyncExternalStore } from 'react';

export const DEMO_DISPLAY_NAME = 'Demo user';

export const DEMO_SESSION_STORAGE_KEY = 'genwood.demo-session';

export interface DemoSession {
  displayName: string;
  /** Epoch milliseconds of sign-in. */
  signedInAt: number;
  /** Epoch milliseconds of the last recorded activity. */
  lastActivityAt: number;
}

type Listener = () => void;

const listeners = new Set<Listener>();

let cachedRaw: string | null = null;
let cachedSession: DemoSession | null = null;

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    // Storage can be unavailable (privacy mode, sandboxed frames): treat as signed out.
    return null;
  }
}

function isDemoSession(value: unknown): value is DemoSession {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.displayName === 'string' &&
    typeof candidate.signedInAt === 'number' &&
    typeof candidate.lastActivityAt === 'number'
  );
}

function parse(raw: string | null): DemoSession | null {
  if (raw === null) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return isDemoSession(value) ? value : null;
  } catch {
    return null;
  }
}

/** Read the current session (null when signed out). Stable between changes. */
export function readDemoSession(): DemoSession | null {
  const raw = getStorage()?.getItem(DEMO_SESSION_STORAGE_KEY) ?? null;
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSession = parse(raw);
  }
  return cachedSession;
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

/** Start a fresh demo session as "Demo user". Any earlier session is replaced. */
export function signInDemo(now: number = Date.now()): DemoSession {
  const session: DemoSession = {
    displayName: DEMO_DISPLAY_NAME,
    signedInAt: now,
    lastActivityAt: now,
  };
  getStorage()?.setItem(DEMO_SESSION_STORAGE_KEY, JSON.stringify(session));
  notify();
  return session;
}

/** End the demo session. */
export function signOutDemo(): void {
  getStorage()?.removeItem(DEMO_SESSION_STORAGE_KEY);
  notify();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === DEMO_SESSION_STORAGE_KEY)
      listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

function getServerSnapshot(): DemoSession | null {
  return null;
}

/** The current demo session, kept in sync with sign-in and sign-out. */
export function useDemoSession(): DemoSession | null {
  return useSyncExternalStore(subscribe, readDemoSession, getServerSnapshot);
}
