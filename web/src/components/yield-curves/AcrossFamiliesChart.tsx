'use client';

import { LineChartCard } from '@/components/charts/LineChartCard';
import { DataState } from '@/components/data-state/DataState';
import { Skeleton } from '@/components/ui/skeleton';
import { compareCurves } from '@/lib/api/endpoints';
import { maturitySegment, rateAxisLabel } from '@/lib/charts/line-chart';
import {
  acrossFamiliesChart,
  acrossFamiliesSubtitle,
  acrossFamiliesTitle,
  curveName,
  familiesNoDataMessage,
  familyCurves,
  noDataImportedMessage,
} from '@/lib/yield-curves/yield-curves';
import type { CurveCompareRead, CurveRead } from '@/types/api-generated';

interface AcrossFamiliesChartProps {
  /** The full curve catalogue the family curves are resolved from. */
  catalogue: readonly CurveRead[];
  /** The selected curve: its rate type and segment pick the family curves. */
  curve: CurveRead;
  /** The applied valuation date; null when the curve has no date yet. */
  valuation: string | null;
}

function AcrossFamiliesCard({
  curve,
  curves,
  date,
  response,
}: {
  curve: CurveRead;
  curves: readonly CurveRead[];
  date: string;
  response: CurveCompareRead;
}) {
  const { series, missing } = acrossFamiliesChart(response, curves, date);
  return (
    <LineChartCard
      title={acrossFamiliesTitle(curve.RateType)}
      subtitle={
        series.length > 0
          ? acrossFamiliesSubtitle(date, curve.Segment, missing)
          : undefined
      }
      yLabel={rateAxisLabel(curve.RateType)}
      series={series}
      emptyMessage={familiesNoDataMessage(missing, date)}
      segment={maturitySegment(curve.Segment)}
      height="regular"
    />
  );
}

/**
 * Across families: the Nominal, Real, Inflation and OIS curves sharing the
 * selected curve's rate type and segment on the valuation date, read through
 * `compareCurves`. Family curves without data are left out and named in the
 * subtitle; none with data → the missing-data line only.
 */
export function AcrossFamiliesChart({
  catalogue,
  curve,
  valuation,
}: AcrossFamiliesChartProps) {
  const title = acrossFamiliesTitle(curve.RateType);
  const curves = familyCurves(catalogue, curve);
  const codes = curves.map((c) => c.Code ?? '').join(',');

  if (!valuation || curves.length === 0) {
    return (
      <LineChartCard
        title={title}
        yLabel={rateAxisLabel(curve.RateType)}
        series={[]}
        emptyMessage={noDataImportedMessage(curveName(curve))}
        height="regular"
      />
    );
  }

  return (
    <DataState
      key={`${codes}|${valuation}`}
      load={() => compareCurves({ Codes: codes, ObservationDates: valuation })}
      skeleton={<Skeleton className="h-85 w-full" />}
    >
      {(response) => (
        <AcrossFamiliesCard
          curve={curve}
          curves={curves}
          date={valuation}
          response={response}
        />
      )}
    </DataState>
  );
}
