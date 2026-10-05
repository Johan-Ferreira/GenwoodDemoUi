'use client';

import { useState } from 'react';

import { CurveSelect } from '@/components/curve-data/CurveSelect';
import { useDateField } from '@/components/curve-data/useValuationDate';
import { ValuationDateField } from '@/components/curve-data/ValuationDateField';
import { DataState } from '@/components/data-state/DataState';
import { Skeleton } from '@/components/ui/skeleton';
import { getCurveAvailability, getCurves } from '@/lib/api/endpoints';
import {
  defaultDates,
  defaultYieldCurveCode,
  longEndCurves,
  type YieldCurvesMode,
} from '@/lib/yield-curves/yield-curves';
import type { AvailabilityRead, CurveRead } from '@/types/api-generated';

import { AcrossDatesChart } from './AcrossDatesChart';
import { AcrossFamiliesChart } from './AcrossFamiliesChart';
import { ChartModeToggle } from './ChartModeToggle';

interface YieldCurvesPanelProps {
  catalogue: readonly CurveRead[];
  curve: CurveRead;
  availability: AvailabilityRead;
  mode: YieldCurvesMode;
  onModeChange: (mode: YieldCurvesMode) => void;
}

/**
 * The chosen curve's date fields, the mode switch and the chart. Renders flex
 * items of the filter row, then the full-width chart. The dates default to the
 * latest and previous dates with data and are kept while switching modes.
 */
function YieldCurvesPanel({
  catalogue,
  curve,
  availability,
  mode,
  onModeChange,
}: YieldCurvesPanelProps) {
  const defaults = defaultDates(availability);
  const valuation = useDateField(defaults.valuation);
  const compare = useDateField(defaults.compare, { optional: true });

  return (
    <>
      <ValuationDateField
        availability={availability}
        draft={valuation.draft}
        applied={valuation.applied}
        invalid={valuation.invalid}
        onType={valuation.type}
        onCommit={valuation.commit}
        onPick={valuation.pick}
      />
      {mode === 'dates' && (
        <ValuationDateField
          availability={availability}
          label="Compare with"
          calendarButtonLabel="Choose comparison date"
          calendarLabel="Comparison date calendar"
          showRange={false}
          draft={compare.draft}
          applied={compare.applied}
          invalid={compare.invalid}
          onType={compare.type}
          onCommit={compare.commit}
          onPick={compare.pick}
        />
      )}
      <div className="ml-auto self-start sm:mt-6">
        <ChartModeToggle value={mode} onChange={onModeChange} />
      </div>
      <div className="basis-full">
        {mode === 'dates' && (
          <AcrossDatesChart
            curve={curve}
            valuation={valuation.applied}
            compare={compare.applied}
          />
        )}
        {mode === 'families' && (
          <AcrossFamiliesChart
            catalogue={catalogue}
            curve={curve}
            valuation={valuation.applied}
          />
        )}
      </div>
    </>
  );
}

/** The Curve select (long-end curves) and everything that depends on the chosen curve. */
function YieldCurvesExplorer({ curves }: { curves: readonly CurveRead[] }) {
  const offered = longEndCurves(curves);
  const [code, setCode] = useState(() => defaultYieldCurveCode(offered));
  const [mode, setMode] = useState<YieldCurvesMode>('dates');
  const curve = offered.find((candidate) => candidate.Code === code);

  return (
    <div className="flex flex-wrap items-start gap-4">
      <CurveSelect
        curves={offered}
        value={curve ? code : ''}
        onChange={setCode}
        placeholder="No long-end curves"
      />
      {curve && (
        <DataState
          key={code}
          load={() => getCurveAvailability(code)}
          skeleton={<Skeleton className="mt-6 h-9 w-80" />}
        >
          {(availability) => (
            <YieldCurvesPanel
              catalogue={curves}
              curve={curve}
              availability={availability}
              mode={mode}
              onModeChange={setMode}
            />
          )}
        </DataState>
      )}
    </div>
  );
}

/** The Yield curves view: catalogue, curve, dates, mode and chart. */
export function YieldCurvesView() {
  return (
    <DataState
      load={() => getCurves()}
      isEmpty={(list) => longEndCurves(list.Curves ?? []).length === 0}
      empty="No long-end curves are available from the data service."
    >
      {(list) => <YieldCurvesExplorer curves={list.Curves ?? []} />}
    </DataState>
  );
}
