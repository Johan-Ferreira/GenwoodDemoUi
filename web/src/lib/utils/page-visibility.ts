'use client';

import { useSyncExternalStore } from 'react';

function subscribe(onChange: () => void): () => void {
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}

function isPageVisible(): boolean {
  return document.visibilityState !== 'hidden';
}

function getServerSnapshot(): boolean {
  return true;
}

/** True while the browser tab is visible; re-renders on `visibilitychange`. */
export function usePageVisible(): boolean {
  return useSyncExternalStore(subscribe, isPageVisible, getServerSnapshot);
}
