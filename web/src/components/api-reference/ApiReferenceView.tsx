'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { CurveSelect } from '@/components/curve-data/CurveSelect';
import { useValuationDate } from '@/components/curve-data/useValuationDate';
import { ValuationDateField } from '@/components/curve-data/ValuationDateField';
import { DataState } from '@/components/data-state/DataState';
import { toServiceErrorShape } from '@/components/data-state/useDataState';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  getCurveAvailability,
  getCurveRates,
  getCurves,
} from '@/lib/api/endpoints';
import { defaultYieldCurveCode } from '@/lib/yield-curves/yield-curves';
import type { ServiceErrorKind } from '@/types/api';
import type { AvailabilityRead, CurveRead } from '@/types/api-generated';

import { API_ENDPOINTS, exampleRequestLine } from './api-endpoints';

/** The applied valuation date, tagged with the curve it was chosen for. */
interface Choice {
  code: string;
  date: string | null;
}

/** A failed availability read, tagged with the curve it was for. */
interface AvailabilityFailure {
  code: string;
  kind: ServiceErrorKind;
}

/** The "Valuation date" field for one curve; reports each applied date. */
function CurveDateField({
  code,
  availability,
  onApplied,
}: {
  code: string;
  availability: AvailabilityRead;
  onApplied: (choice: Choice) => void;
}) {
  const date = useValuationDate(availability);
  const { applied } = date;
  useEffect(() => {
    onApplied({ code, date: applied });
  }, [code, applied, onApplied]);

  return (
    <ValuationDateField
      availability={availability}
      draft={date.draft}
      applied={date.applied}
      invalid={date.invalid}
      onType={date.type}
      onCommit={date.commit}
      onPick={date.pick}
    />
  );
}

/** "Endpoints": method and live /v1 path of the four curve and import reads. */
function EndpointsCard() {
  const titleId = useId();
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <h2 id={titleId} className="border-b px-3 py-2.5 font-semibold">
        Endpoints
      </h2>
      <Table aria-labelledby={titleId}>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20 px-3">Method</TableHead>
            <TableHead className="px-3">Path</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {API_ENDPOINTS.map((endpoint) => (
            <TableRow key={endpoint.path}>
              <TableCell className="px-3 font-mono">
                {endpoint.method}
              </TableCell>
              <TableCell className="px-3 font-mono break-all whitespace-normal">
                {endpoint.path}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

/** The live rates response for the chosen curve and date, as JSON. */
function ExampleResponse({ code, date }: { code: string; date: string }) {
  return (
    <DataState
      key={`${code}|${date}`}
      load={() => getCurveRates(code, { ObservationDate: date })}
      skeleton={<Skeleton className="h-40 w-full" />}
    >
      {(rates) => (
        <pre
          tabIndex={0}
          className="focus-ring max-h-[420px] overflow-auto rounded-md border bg-muted p-3 font-mono text-xs text-foreground"
        >
          {JSON.stringify(rates, null, 2)}
        </pre>
      )}
    </DataState>
  );
}

/**
 * "Example request and response": the rates request at the service address
 * for the chosen curve and date, and the service's live answer to it.
 */
function ExampleCard({
  serviceBase,
  code,
  date,
  loadingDate,
  dateFailure,
}: {
  serviceBase: string;
  code: string;
  date: string | null;
  loadingDate: boolean;
  /** Set when the curve's valuation dates could not be loaded. */
  dateFailure: ServiceErrorKind | null;
}) {
  const titleId = useId();
  let body;
  if (dateFailure !== null) {
    body = (
      <p className="text-danger">
        {dateFailure === 'not-authorised'
          ? 'The example cannot be shown because the request for this curve’s valuation dates was not authorised.'
          : 'The example cannot be shown because this curve’s valuation dates could not be loaded. Choose Retry beside the curve to try again.'}
      </p>
    );
  } else if (loadingDate) {
    body = <Skeleton className="h-40 w-full" />;
  } else if (date === null) {
    body = (
      <p className="text-muted-foreground">
        No dates with data yet for this curve. Choose another curve to see an
        example.
      </p>
    );
  } else {
    body = <ExampleResponse code={code} date={date} />;
  }

  return (
    <Card
      role="region"
      aria-labelledby={titleId}
      className="min-w-0 gap-0 overflow-hidden py-0"
    >
      <div className="border-b px-3 py-2.5">
        <h2 id={titleId} className="font-semibold text-foreground">
          Example request and response
        </h2>
        {date !== null && !loadingDate && (
          <p className="font-mono text-xs break-all text-muted-foreground">
            {exampleRequestLine(serviceBase, code, date)}
          </p>
        )}
      </div>
      <div className="p-3">{body}</div>
    </Card>
  );
}

/** Curve and date choices, then the endpoints and the example side by side. */
function ApiReferenceExplorer({
  curves,
  serviceBase,
}: {
  curves: readonly CurveRead[];
  serviceBase: string;
}) {
  const [code, setCode] = useState(() => defaultYieldCurveCode(curves));
  const [choice, setChoice] = useState<Choice | null>(null);
  const [failure, setFailure] = useState<AvailabilityFailure | null>(null);
  const current = choice?.code === code ? choice : null;
  const currentFailure = failure?.code === code ? failure.kind : null;
  const latestCode = useRef(code);
  useEffect(() => {
    latestCode.current = code;
  });

  /** Loads the curve's dates, tracking a failure so the example stops waiting on it. */
  const loadAvailability = (curveCode: string) => {
    setFailure(null);
    return getCurveAvailability(curveCode).catch((reason: unknown) => {
      if (latestCode.current === curveCode) {
        setFailure({ code: curveCode, kind: toServiceErrorShape(reason).kind });
      }
      throw reason;
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start gap-4">
        <CurveSelect
          curves={curves}
          value={code}
          onChange={setCode}
          placeholder="No curves"
        />
        {code && (
          <DataState
            key={code}
            load={() => loadAvailability(code)}
            skeleton={<Skeleton className="mt-6 h-9 w-80" />}
          >
            {(availability) => (
              <CurveDateField
                code={code}
                availability={availability}
                onApplied={setChoice}
              />
            )}
          </DataState>
        )}
      </div>
      <div className="grid grid-cols-[1fr_1.4fr] items-start gap-5">
        <EndpointsCard />
        <ExampleCard
          serviceBase={serviceBase}
          code={code}
          date={current?.date ?? null}
          loadingDate={current === null && currentFailure === null}
          dateFailure={current === null ? currentFailure : null}
        />
      </div>
    </div>
  );
}

/** The API reference view: loads the curve catalogue, then the explorer. */
export function ApiReferenceView({ serviceBase }: { serviceBase: string }) {
  return (
    <DataState
      load={() => getCurves()}
      isEmpty={(list) => (list.Curves ?? []).length === 0}
      empty="No curves are available from the data service."
    >
      {(list) => (
        <ApiReferenceExplorer
          curves={list.Curves ?? []}
          serviceBase={serviceBase}
        />
      )}
    </DataState>
  );
}
