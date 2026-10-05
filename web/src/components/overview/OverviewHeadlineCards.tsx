import {
  NO_DATA,
  NO_RATES_IMPORTED,
  changeLine,
  filesReceivedLine,
  filesReceivedTotal,
  findHeadlineRate,
  formatRatePercent,
  latestValuationDate,
} from '@/lib/overview/overview-format';
import type { OverviewRead } from '@/types/api-generated';

import { StatCard } from './StatCard';

const HEADLINE_RATES = [
  { label: '10Y nominal spot', family: 'Nominal' },
  { label: '10Y implied inflation', family: 'Inflation' },
] as const;

function HeadlineRateCard({
  label,
  family,
  overview,
}: {
  label: string;
  family: string;
  overview: OverviewRead;
}) {
  const rate = findHeadlineRate(overview.KeyRates, family);
  const value = formatRatePercent(rate?.RatePercent);
  if (value === null) {
    return <StatCard label={label} value={NO_DATA} numeric={false} />;
  }
  const change = changeLine(rate?.ChangeBp);
  return (
    <StatCard
      label={label}
      value={value}
      unit="%"
      detail={change ?? undefined}
    />
  );
}

/** The four Overview stat cards, from one `OverviewRead`. */
export function OverviewHeadlineCards({
  overview,
}: {
  overview: OverviewRead;
}) {
  const date = latestValuationDate(overview.LatestValuationDate);
  const total = filesReceivedTotal(overview.FileCounts);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {date ? (
        <StatCard label="Latest valuation date" value={date} />
      ) : (
        <StatCard
          label="Latest valuation date"
          value={NO_DATA}
          numeric={false}
          detail={{ text: NO_RATES_IMPORTED }}
        />
      )}
      {HEADLINE_RATES.map(({ label, family }) => (
        <HeadlineRateCard
          key={label}
          label={label}
          family={family}
          overview={overview}
        />
      ))}
      {total !== null && overview.FileCounts ? (
        <StatCard
          label="Files received"
          value={total}
          detail={{ text: filesReceivedLine(overview.FileCounts) }}
        />
      ) : (
        <StatCard label="Files received" value={NO_DATA} numeric={false} />
      )}
    </div>
  );
}
