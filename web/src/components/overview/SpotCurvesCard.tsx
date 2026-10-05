'use client';

import { useMemo } from 'react';

import { LineChartCard } from '@/components/charts/LineChartCard';
import {
  NO_SPOT_CURVES,
  SPOT_CURVES_TITLE,
  SPOT_RATE_LABEL,
  spotCurvesChart,
  spotCurvesSubtitle,
} from '@/lib/overview/spot-curves';
import type { SpotCurveItem } from '@/types/api-generated';

/**
 * "Spot curves on latest valuation date": the nominal, real and inflation spot
 * curves from the Overview read, leaving out (and naming) any family without
 * data. No curves at all → the title and one empty-state line only.
 */
export function SpotCurvesCard({
  curves,
}: {
  curves: readonly SpotCurveItem[] | undefined;
}) {
  const { series, missing } = useMemo(() => spotCurvesChart(curves), [curves]);
  return (
    <LineChartCard
      title={SPOT_CURVES_TITLE}
      subtitle={series.length > 0 ? spotCurvesSubtitle(missing) : undefined}
      yLabel={SPOT_RATE_LABEL}
      series={series}
      emptyMessage={NO_SPOT_CURVES}
      height="compact"
    />
  );
}
