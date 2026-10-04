'use client';

import { CircleAlert, Lock } from 'lucide-react';
import type { ReactNode } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { ServiceErrorShape } from '@/types/api';

import { useDataState } from './useDataState';

export interface DataStateProps<T> {
  /** The read to run, e.g. `() => get<T>('/v1/overview')`. */
  load: () => Promise<T>;
  /** Renders the loaded data. */
  children: (data: T) => ReactNode;
  /** Optional skeleton shaped like the content (default: three bars). */
  skeleton?: ReactNode;
  /** When true for the loaded data, `empty` is shown instead of `children`. */
  isEmpty?: (data: T) => boolean;
  /** Empty-state copy: say what happened, then what to do. */
  empty?: ReactNode;
}

const DEFAULT_EMPTY = 'There is nothing to show yet.';

function DefaultSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

/** Persistent service-error message with Retry (R7, BR6). */
export function ServiceErrorMessage({
  error,
  onRetry,
}: {
  error: ServiceErrorShape;
  onRetry: () => void;
}) {
  return (
    <Alert className="border-danger-border bg-danger-surface text-danger">
      <CircleAlert aria-hidden="true" />
      <AlertTitle>The data could not be loaded.</AlertTitle>
      <AlertDescription className="text-danger">
        <p>{error.description}</p>
        <p>Choose Retry to try again.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={onRetry}
        >
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
}

/** In-page not-authorised message naming how to request access (R8). */
export function NotAuthorisedMessage({ error }: { error: ServiceErrorShape }) {
  return (
    <Alert className="border-warning-border bg-warning-surface text-warning">
      <Lock aria-hidden="true" />
      <AlertTitle>This request was not authorised.</AlertTitle>
      <AlertDescription className="text-warning">
        <p>{error.description}</p>
        <p>
          To request access, contact your Genwood administrator and ask for
          access to the yield curve data service.
        </p>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Shared loading / error / not-authorised / empty handling for a read.
 * Loading thresholds (R9): nothing for 300 ms, then a skeleton, and after 3 s
 * the skeleton plus a "taking longer than usual" line.
 */
export function DataState<T>({
  load,
  children,
  skeleton,
  isEmpty,
  empty = DEFAULT_EMPTY,
}: DataStateProps<T>) {
  const { state, retry } = useDataState(load);

  if (state.status === 'loading') {
    if (state.phase === 'hidden') return null;
    return (
      <div role="status" aria-label="Loading" className="flex flex-col gap-3">
        {skeleton ?? <DefaultSkeleton />}
        {state.phase === 'slow' && (
          <p className="text-muted-foreground">
            Loading is taking longer than usual. The data will appear here as
            soon as it arrives.
          </p>
        )}
      </div>
    );
  }

  if (state.status === 'error') {
    return state.error.kind === 'not-authorised' ? (
      <NotAuthorisedMessage error={state.error} />
    ) : (
      <ServiceErrorMessage error={state.error} onRetry={retry} />
    );
  }

  if (isEmpty?.(state.data)) {
    return <p className="text-muted-foreground">{empty}</p>;
  }

  return <>{children(state.data)}</>;
}
