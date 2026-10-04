'use client';

import { useRef, type KeyboardEvent } from 'react';

import { Button } from '@/components/ui/button';

/** The two table views of a curve. */
export type RatesView = 'maturity' | 'date';

export const RATES_VIEWS: ReadonlyArray<{ value: RatesView; label: string }> = [
  { value: 'maturity', label: 'By maturity' },
  { value: 'date', label: 'By date' },
];

/** Id of a view's tab, for the panel's `aria-labelledby`. */
export function ratesViewTabId(baseId: string, view: RatesView): string {
  return `${baseId}-tab-${view}`;
}

/** Id of the (single, active) view panel. */
export function ratesViewPanelId(baseId: string): string {
  return `${baseId}-panel`;
}

interface RatesViewTabsProps {
  /** Shared id prefix linking the tabs to the panel. */
  baseId: string;
  value: RatesView;
  onChange: (view: RatesView) => void;
}

/**
 * The "By maturity" / "By date" segmented switch: Shadcn buttons in a tablist
 * (active primary, other secondary). Arrow keys, Home and End move between
 * the tabs and select the focused one.
 */
export function RatesViewTabs({ baseId, value, onChange }: RatesViewTabsProps) {
  const refs = useRef<Partial<Record<RatesView, HTMLButtonElement | null>>>({});

  const select = (index: number) => {
    const count = RATES_VIEWS.length;
    const next = RATES_VIEWS[(index + count) % count].value;
    onChange(next);
    refs.current[next]?.focus();
  };

  const onKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const moves: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: RATES_VIEWS.length - 1,
    };
    if (event.key in moves) {
      event.preventDefault();
      select(moves[event.key]);
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Rates view"
      className="flex gap-1 self-start sm:mt-6"
    >
      {RATES_VIEWS.map((view, index) => {
        const selected = view.value === value;
        return (
          <Button
            key={view.value}
            ref={(element) => {
              refs.current[view.value] = element;
            }}
            id={ratesViewTabId(baseId, view.value)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={selected ? ratesViewPanelId(baseId) : undefined}
            tabIndex={selected ? 0 : -1}
            variant={selected ? 'default' : 'secondary'}
            onClick={() => onChange(view.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {view.label}
          </Button>
        );
      })}
    </div>
  );
}
