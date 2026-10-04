'use client';

import { useState, type ReactNode } from 'react';

import { DataState } from '@/components/data-state/DataState';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getCurveAvailability,
  getCurves,
  getCurveTenors,
} from '@/lib/api/endpoints';
import { curveSubtitle } from '@/lib/curves/curve-format';
import type {
  AvailabilityRead,
  CurveRead,
  TenorRead,
} from '@/types/api-generated';

import { CurveSelect } from './CurveSelect';
import { NoDataImported, RatesByMaturity } from './RatesByMaturity';
import { useValuationDate } from './useValuationDate';
import { ValuationDateField } from './ValuationDateField';

/** What a chosen curve needs before its rates can be read. */
interface CurveContext {
  availability: AvailabilityRead;
  tenors: TenorRead[];
}

async function loadCurveContext(code: string): Promise<CurveContext> {
  const [availability, tenorList] = await Promise.all([
    getCurveAvailability(code),
    getCurveTenors(code),
  ]);
  return { availability, tenors: tenorList.Tenors ?? [] };
}

/** Card with the curve's name and "{Family} · {type} · {segment} · {Code}". */
function CurveCard({
  curve,
  children,
}: {
  curve: CurveRead;
  children: ReactNode;
}) {
  return (
    <Card className="w-full basis-full gap-0 overflow-hidden py-0">
      <div className="border-b px-3 py-2.5">
        <h2 className="font-semibold text-foreground">
          {curve.Name ?? curve.Code}
        </h2>
        <p className="text-xs text-muted-foreground">{curveSubtitle(curve)}</p>
      </div>
      {children}
    </Card>
  );
}

/**
 * The chosen curve's valuation date and rates. Renders flex items of the
 * filter row (the date field, then the full-width table card).
 */
function CurvePanel({
  curve,
  context,
}: {
  curve: CurveRead;
  context: CurveContext;
}) {
  const date = useValuationDate(context.availability);
  return (
    <>
      <ValuationDateField
        availability={context.availability}
        draft={date.draft}
        invalid={date.invalid}
        onType={date.type}
        onCommit={date.commit}
      />
      <CurveCard curve={curve}>
        {date.applied && curve.Code ? (
          <RatesByMaturity
            code={curve.Code}
            tenors={context.tenors}
            date={date.applied}
          />
        ) : (
          <NoDataImported />
        )}
      </CurveCard>
    </>
  );
}

/** Curve select plus everything that depends on the chosen curve. */
function CurveExplorer({ curves }: { curves: readonly CurveRead[] }) {
  const [code, setCode] = useState(curves[0]?.Code ?? '');
  const curve = curves.find((candidate) => candidate.Code === code);

  return (
    <div className="flex flex-wrap items-start gap-4">
      <CurveSelect curves={curves} value={code} onChange={setCode} />
      {curve && (
        <DataState
          key={code}
          load={() => loadCurveContext(code)}
          skeleton={<Skeleton className="mt-6 h-9 w-44" />}
        >
          {(context) => <CurvePanel curve={curve} context={context} />}
        </DataState>
      )}
    </div>
  );
}

/** The Curve data view: catalogue, curve, valuation date and rates by maturity. */
export function CurveDataView() {
  return (
    <DataState
      load={getCurves}
      isEmpty={(list) => (list.Curves ?? []).length === 0}
      empty="No curves are available from the data service."
    >
      {(list) => <CurveExplorer curves={list.Curves ?? []} />}
    </DataState>
  );
}
