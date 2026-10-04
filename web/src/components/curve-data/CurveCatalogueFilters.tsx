'use client';

import {
  ALL_OPTION,
  FilterSelect,
} from '@/components/filter-select/FilterSelect';
import { Button } from '@/components/ui/button';
import {
  CURVE_SEGMENTS,
  hasCurveFilters,
  RATE_TYPES,
  type CurveFilters,
} from '@/lib/curves/curve-filters';
import { CURVE_FAMILIES } from '@/types/files';

interface CurveCatalogueFiltersProps {
  filters: CurveFilters;
  onChange: (filters: CurveFilters) => void;
  onClear: () => void;
}

const toSelectValue = (value: string | null) => value ?? ALL_OPTION;
const fromSelectValue = (value: string) =>
  value === ALL_OPTION ? null : value;

/** Family / Rate type / Segment selects (each "All" by default) and "Clear filters". */
export function CurveCatalogueFilters({
  filters,
  onChange,
  onClear,
}: CurveCatalogueFiltersProps) {
  return (
    <div
      role="group"
      aria-label="Filter curves"
      className="flex flex-wrap items-end gap-4"
    >
      <FilterSelect
        label="Family"
        value={toSelectValue(filters.family)}
        allLabel="All"
        options={CURVE_FAMILIES}
        onChange={(value) =>
          onChange({ ...filters, family: fromSelectValue(value) })
        }
      />
      <FilterSelect
        label="Rate type"
        value={toSelectValue(filters.rateType)}
        allLabel="All"
        options={RATE_TYPES}
        onChange={(value) =>
          onChange({ ...filters, rateType: fromSelectValue(value) })
        }
      />
      <FilterSelect
        label="Segment"
        value={toSelectValue(filters.segment)}
        allLabel="All"
        options={CURVE_SEGMENTS}
        onChange={(value) =>
          onChange({ ...filters, segment: fromSelectValue(value) })
        }
      />
      {hasCurveFilters(filters) && (
        <Button type="button" variant="secondary" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
