'use client';

import { useId, useState, type ReactNode } from 'react';

import { DataState } from '@/components/data-state/DataState';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getCurveAvailability,
  getCurves,
  getCurveTenors,
} from '@/lib/api/endpoints';
import { curveSubtitle } from '@/lib/curves/curve-format';
import { keyTenorLabels } from '@/lib/curves/rate-matrix';
import {
  filterCurveCatalogue,
  keepOrFirstCurve,
  NO_CURVE_FILTERS,
  type CurveFilters,
} from '@/lib/curves/curve-filters';
import { isIsoDate } from '@/lib/validation/iso-date';
import type {
  AvailabilityRead,
  CurveRead,
  TenorRead,
} from '@/types/api-generated';

import { CurveCatalogueFilters } from './CurveCatalogueFilters';
import { ExportCsvButton, ExportCsvFailure, useCsvExport } from './ExportCsv';
import { CurveSelect } from './CurveSelect';
import { RatesByDate } from './RatesByDate';
import { RatesByDateFields } from './RatesByDateFields';
import { NoDataImported, RatesByMaturity } from './RatesByMaturity';
import {
  ratesViewPanelId,
  ratesViewTabId,
  RatesViewTabs,
  type RatesView,
} from './RatesViewTabs';
import { useRatesByDateInputs } from './useRatesByDateInputs';
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

interface CurvePanelProps {
  curve: CurveRead;
  context: CurveContext;
  view: RatesView;
  onViewChange: (view: RatesView) => void;
}

/**
 * The chosen curve's inputs, view switch and rates. Renders flex items of the
 * filter row (the active view's fields, the By maturity / By date tabs, then
 * the full-width table card). Both views' inputs live here, so switching
 * views keeps what was entered.
 */
function CurvePanel({ curve, context, view, onViewChange }: CurvePanelProps) {
  const baseId = useId();
  const date = useValuationDate(context.availability);
  const byDate = useRatesByDateInputs(context.availability);
  const keyTenors = keyTenorLabels(curve, context.tenors);
  const code = curve.Code;

  const enteredTenors = byDate.tenors.applied;
  const matrixTenors = enteredTenors.length > 0 ? enteredTenors : keyTenors;

  // Export the shown By maturity table; unavailable in By date and while the
  // typed valuation date is not a real YYYY-MM-DD date.
  const csv = useCsvExport();
  const exportDate =
    view === 'maturity' && code && isIsoDate(date.draft.trim())
      ? date.applied
      : null;
  const runExport = () => {
    if (code && exportDate) void csv.exportCsv(code, exportDate);
  };

  let table: ReactNode;
  if (!code) {
    table = <NoDataImported />;
  } else if (view === 'date') {
    table = (
      <RatesByDate
        code={code}
        from={byDate.from.applied}
        to={byDate.to.applied}
        tenors={matrixTenors}
        selectedDate={date.applied}
      />
    );
  } else {
    table = date.applied ? (
      <RatesByMaturity
        code={code}
        tenors={context.tenors}
        date={date.applied}
      />
    ) : (
      <NoDataImported />
    );
  }

  return (
    <>
      {view === 'date' ? (
        <RatesByDateFields inputs={byDate} keyTenors={keyTenors} />
      ) : (
        <ValuationDateField
          availability={context.availability}
          draft={date.draft}
          invalid={date.invalid}
          onType={date.type}
          onCommit={date.commit}
        />
      )}
      <div className="ml-auto flex items-start gap-2">
        <RatesViewTabs baseId={baseId} value={view} onChange={onViewChange} />
        <div className="self-start sm:mt-6">
          <ExportCsvButton
            disabled={!exportDate}
            exporting={csv.state.status === 'exporting'}
            onExport={runExport}
          />
        </div>
      </div>
      {csv.state.status === 'error' && (
        <ExportCsvFailure error={csv.state.error} onRetry={runExport} />
      )}
      <CurveCard curve={curve}>
        <div
          role="tabpanel"
          id={ratesViewPanelId(baseId)}
          aria-labelledby={ratesViewTabId(baseId, view)}
        >
          {table}
        </div>
      </CurveCard>
    </>
  );
}

/** Shown in place of the curve when the catalogue filters match nothing. */
export const NO_CURVES_MATCH = 'No curves match these filters.';

/**
 * Catalogue filters, the Curve select over the matching curves, and everything
 * that depends on the chosen curve. When a filter change drops the chosen
 * curve, the first matching curve (catalogue order) is chosen instead.
 */
function CurveExplorer({ curves }: { curves: readonly CurveRead[] }) {
  const [filters, setFilters] = useState<CurveFilters>(NO_CURVE_FILTERS);
  const [code, setCode] = useState(curves[0]?.Code ?? '');
  const [view, setView] = useState<RatesView>('maturity');
  const listed = filterCurveCatalogue(curves, filters);
  const curve = listed.find((candidate) => candidate.Code === code);

  const applyFilters = (next: CurveFilters) => {
    setFilters(next);
    setCode((current) =>
      keepOrFirstCurve(filterCurveCatalogue(curves, next), current),
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <CurveCatalogueFilters
        filters={filters}
        onChange={applyFilters}
        onClear={() => applyFilters(NO_CURVE_FILTERS)}
      />
      <div className="flex flex-wrap items-start gap-4">
        <CurveSelect
          curves={listed}
          value={curve ? code : ''}
          onChange={setCode}
          placeholder="No matching curves"
        />
        {listed.length === 0 && (
          <p role="status" className="basis-full text-muted-foreground">
            {NO_CURVES_MATCH} Clear the filters to list every curve.
          </p>
        )}
        {curve && (
          <DataState
            key={code}
            load={() => loadCurveContext(code)}
            skeleton={<Skeleton className="mt-6 h-9 w-44" />}
          >
            {(context) => (
              <CurvePanel
                curve={curve}
                context={context}
                view={view}
                onViewChange={setView}
              />
            )}
          </DataState>
        )}
      </div>
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
