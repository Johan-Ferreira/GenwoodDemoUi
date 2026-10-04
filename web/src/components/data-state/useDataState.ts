'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { isServiceError } from '@/lib/api/service-error';
import { LOADING_THRESHOLDS } from '@/lib/utils/constants';
import { usePageVisible } from '@/lib/utils/page-visibility';
import type { ServiceErrorShape } from '@/types/api';

/** Loading phases (UI-17): hidden → skeleton (300 ms) → slow (3 s). */
export type LoadingPhase = 'hidden' | 'skeleton' | 'slow';

export type DataLoadState<T> =
  | { status: 'loading'; phase: LoadingPhase }
  | { status: 'success'; data: T }
  | { status: 'error'; error: ServiceErrorShape };

/**
 * Any rejection becomes a ServiceErrorShape so it is always reported, never
 * swallowed (BR6). Non-service failures keep their own message.
 */
export function toServiceErrorShape(reason: unknown): ServiceErrorShape {
  if (isServiceError(reason)) return reason;
  const detail =
    reason instanceof Error && reason.message ? ` (${reason.message})` : '';
  return {
    status: 0,
    description: `The data could not be loaded${detail}.`,
    retryable: true,
    kind: 'service-error',
  };
}

const INITIAL_LOADING = { status: 'loading', phase: 'hidden' } as const;

/**
 * Silent-refresh options. A silent refresh re-runs `load` while the loaded
 * data stays on screen (no loading state, no skeleton); a failure still
 * becomes the error state, so it is never swallowed.
 */
export interface DataStateRefreshOptions<T> {
  /**
   * Re-check in the background every N ms after each successful load, while
   * the tab is visible (with an immediate re-check when it becomes visible
   * again); return `null` to stop.
   */
  refreshEvery?: (data: T) => number | null;
  /**
   * Re-check in the background whenever this value changes after mount from
   * one non-null value to another (`null` = not known yet).
   */
  refreshKey?: string | number | null;
  /** Called with every successful load (first and background ones). */
  onData?: (data: T) => void;
}

/**
 * Runs `load` on mount (and on `retry`) and tracks the loading thresholds,
 * with optional silent refreshes (`refreshEvery`, `refreshKey`).
 * `load` may be an inline function; only the latest one is called, and only
 * the latest read's result is applied.
 */
export function useDataState<T>(
  load: () => Promise<T>,
  options: DataStateRefreshOptions<T> = {},
) {
  const { refreshEvery, refreshKey, onData } = options;
  const loadRef = useRef(load);
  const onDataRef = useRef(onData);
  useEffect(() => {
    loadRef.current = load;
    onDataRef.current = onData;
  });

  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<DataLoadState<T>>(INITIAL_LOADING);
  const latestRun = useRef(0);

  const run = useCallback(() => {
    latestRun.current += 1;
    const runId = latestRun.current;
    loadRef.current().then(
      (data) => {
        if (latestRun.current !== runId) return;
        setState({ status: 'success', data });
        onDataRef.current?.(data);
      },
      (reason: unknown) => {
        if (latestRun.current !== runId) return;
        setState({ status: 'error', error: toServiceErrorShape(reason) });
      },
    );
  }, []);

  useEffect(() => {
    run();
    return () => {
      // Unmount or retry: any read still in flight is stale.
      latestRun.current += 1;
    };
  }, [attempt, run]);

  // Silent refresh when `refreshKey` changes from one known value to another
  // (not on mount; a first known value after `null` is only the baseline).
  const lastRefreshKey = useRef(refreshKey ?? null);
  useEffect(() => {
    const next = refreshKey ?? null;
    const previous = lastRefreshKey.current;
    if (previous === next) return;
    lastRefreshKey.current = next;
    if (previous !== null && next !== null) run();
  }, [refreshKey, run]);

  // Silent background re-check after each successful load, while visible.
  // Paused while the tab is hidden; on becoming visible again it re-checks
  // straight away, then resumes the normal interval.
  const visible = usePageVisible();
  const wasVisible = useRef(visible);
  const refreshDelay =
    state.status === 'success' && refreshEvery
      ? refreshEvery(state.data)
      : null;
  useEffect(() => {
    const resumed = visible && !wasVisible.current;
    wasVisible.current = visible;
    if (refreshDelay === null || !visible) return;
    if (resumed) {
      run();
      return;
    }
    const timer = setTimeout(run, refreshDelay);
    return () => clearTimeout(timer);
  }, [refreshDelay, visible, state, run]);

  const isLoading = state.status === 'loading';
  useEffect(() => {
    if (!isLoading) return;
    const toPhase = (phase: LoadingPhase) => () =>
      setState((current) =>
        current.status === 'loading' ? { status: 'loading', phase } : current,
      );
    const skeletonTimer = setTimeout(
      toPhase('skeleton'),
      LOADING_THRESHOLDS.SKELETON_AFTER_MS,
    );
    const slowTimer = setTimeout(
      toPhase('slow'),
      LOADING_THRESHOLDS.SLOW_AFTER_MS,
    );
    return () => {
      clearTimeout(skeletonTimer);
      clearTimeout(slowTimer);
    };
  }, [isLoading, attempt]);

  const retry = useCallback(() => {
    setState(INITIAL_LOADING);
    setAttempt((current) => current + 1);
  }, []);

  return { state, retry };
}
