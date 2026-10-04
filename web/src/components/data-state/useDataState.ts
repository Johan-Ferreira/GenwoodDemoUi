'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { isServiceError } from '@/lib/api/service-error';
import { LOADING_THRESHOLDS } from '@/lib/utils/constants';
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
 * Runs `load` on mount (and on `retry`) and tracks the loading thresholds.
 * `load` may be an inline function; only the latest one is called.
 */
export function useDataState<T>(load: () => Promise<T>) {
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<DataLoadState<T>>(INITIAL_LOADING);

  useEffect(() => {
    let active = true;
    loadRef.current().then(
      (data) => {
        if (active) setState({ status: 'success', data });
      },
      (reason: unknown) => {
        if (active) {
          setState({ status: 'error', error: toServiceErrorShape(reason) });
        }
      },
    );
    return () => {
      active = false;
    };
  }, [attempt]);

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
