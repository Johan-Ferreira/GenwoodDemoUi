import type { Metadata } from 'next';
import { PageHeader } from '@/components/app-shell/PageHeader';
import { YieldCurvesView } from '@/components/yield-curves/YieldCurvesView';
import { YIELD_CURVES_SUBTITLE } from '@/lib/yield-curves/yield-curves';

export const metadata: Metadata = { title: 'Yield curves' };

/** Yield curves: a curve across dates, or the curve families on one date. */
export default function YieldCurvesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Yield curves" subtitle={YIELD_CURVES_SUBTITLE} />
      <YieldCurvesView />
    </div>
  );
}
