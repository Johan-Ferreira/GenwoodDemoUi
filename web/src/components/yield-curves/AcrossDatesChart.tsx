'use client';

import { LineChartCard } from '@/components/charts/LineChartCard';
import { DataState } from '@/components/data-state/DataState';
import { Skeleton } from '@/components/ui/skeleton';
import { compareCurves } from '@/lib/api/endpoints';
import { maturitySegment, rateAxisLabel } from '@/lib/charts/line-chart';
import {
  acrossDatesChart,
  acrossDatesDates,
  acrossDatesSubtitle,
  curveName,
  noDataImportedMessage,
} from '@/lib/yield-curves/yield-curves';
import type { CurveCompareRead, CurveRead } from '@/types/api-generated';

interface AcrossDatesChartProps {
  curve: CurveRead;
  /** The applied valuation date; null when the curve has no date yet. */
  valuation: string | null;
  /** The applied comparison date; null for a single-date chart (R7). */
  compare: string | null;
}

function AcrossDatesCard({
  curve,
  dates,
  response,
}: {
  curve: CurveRead;
  dates: readonly string[];
  response: CurveCompareRead;
}) {
  const name = curveName(curve);
  const { series, missing } = acrossDatesChart(
    response,
    curve.Code ?? '',
    dates,
  );
  return (
    <LineChartCard
      title={name}
      subtitle={
        series.length > 0
          ? acrossDatesSubtitle(name, dates, missing)
          : undefined
      }
      yLabel={rateAxisLabel(curve.RateType)}
      series={series}
      emptyMessage={noDataImportedMessage(name, missing)}
      segment={maturitySegment(curve.Segment)}
      height="regular"
    />
  );
}

/**
 * Across dates: the chosen curve on the valuation date and (dashed) on the
 * comparison date, read through `compareCurves`. Dates without data are left
 * out and named in the subtitle; none with data → the missing-data line only.
 */
export function AcrossDatesChart({
  curve,
  valuation,
  compare,
}: AcrossDatesChartProps) {
  const code = curve.Code ?? '';
  const name = curveName(curve);

  if (!valuation) {
    return (
      <LineChartCard
        title={name}
        yLabel={rateAxisLabel(curve.RateType)}
        series={[]}
        emptyMessage={noDataImportedMessage(name)}
        height="regular"
      />
    );
  }

  const dates = acrossDatesDates(valuation, compare);
  return (
    <DataState
      key={`${code}|${dates.join(',')}`}
      load={() =>
        compareCurves({ Codes: code, ObservationDates: dates.join(',') })
      }
      skeleton={<Skeleton className="h-85 w-full" />}
    >
      {(response) => (
        <AcrossDatesCard curve={curve} dates={dates} response={response} />
      )}
    </DataState>
  );
}
