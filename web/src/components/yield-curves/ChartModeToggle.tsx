'use client';

import { Button } from '@/components/ui/button';
import type { YieldCurvesMode } from '@/lib/yield-curves/yield-curves';

const MODES: ReadonlyArray<{ value: YieldCurvesMode; label: string }> = [
  { value: 'dates', label: 'Across dates' },
  { value: 'families', label: 'Across families' },
];

/** "Across dates" / "Across families" segmented pair (`aria-pressed` on the active one). */
export function ChartModeToggle({
  value,
  onChange,
}: {
  value: YieldCurvesMode;
  onChange: (mode: YieldCurvesMode) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Chart mode"
      className="inline-flex rounded-md border bg-card p-0.5"
    >
      {MODES.map((mode) => {
        const active = mode.value === value;
        return (
          <Button
            key={mode.value}
            type="button"
            size="sm"
            variant={active ? 'default' : 'ghost'}
            aria-pressed={active}
            onClick={() => onChange(mode.value)}
          >
            {mode.label}
          </Button>
        );
      })}
    </div>
  );
}
