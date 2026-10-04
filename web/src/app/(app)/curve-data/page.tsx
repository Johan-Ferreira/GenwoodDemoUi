import type { Metadata } from 'next';

import { PageHeader } from '@/components/app-shell/PageHeader';
import { CurveDataView } from '@/components/curve-data/CurveDataView';

export const metadata: Metadata = { title: 'Curve data' };

export default function CurveDataPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Curve data"
        subtitle="Published rates by curve, valuation date and maturity."
      />
      <CurveDataView />
    </div>
  );
}
