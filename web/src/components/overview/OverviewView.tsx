'use client';

import { useCallback, useState } from 'react';

import { PageHeader } from '@/components/app-shell/PageHeader';
import { DataState } from '@/components/data-state/DataState';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getOverview } from '@/lib/api/endpoints';
import {
  latestValuationDate,
  overviewSubtitle,
} from '@/lib/overview/overview-format';
import type { OverviewRead } from '@/types/api-generated';

import { OverviewHeadlineCards } from './OverviewHeadlineCards';
import { RecentLoadsCard } from './RecentLoadsCard';
import { SpotCurvesCard } from './SpotCurvesCard';

function OverviewSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <Card key={i} className="gap-2 px-5 py-4 shadow-xs">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </Card>
      ))}
    </div>
  );
}

/**
 * The Overview view: one `GET /v1/overview` read (NFR1) in `DataState`, the
 * title with a subtitle naming the latest valuation date, the stat cards, the
 * spot curves chart and the recent loads.
 */
export function OverviewView() {
  const [latestDate, setLatestDate] = useState<string | null>(null);
  const handleData = useCallback((data: OverviewRead) => {
    setLatestDate(latestValuationDate(data.LatestValuationDate));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Overview" subtitle={overviewSubtitle(latestDate)} />
      <DataState
        load={getOverview}
        onData={handleData}
        skeleton={<OverviewSkeleton />}
      >
        {(overview) => (
          <div className="flex flex-col gap-5">
            <OverviewHeadlineCards overview={overview} />
            <SpotCurvesCard curves={overview.SpotCurves} />
            <RecentLoadsCard files={overview.RecentFiles} />
          </div>
        )}
      </DataState>
    </div>
  );
}
