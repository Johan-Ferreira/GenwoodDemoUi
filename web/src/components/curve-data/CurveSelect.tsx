'use client';

import { useId } from 'react';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CurveRead } from '@/types/api-generated';

interface CurveSelectProps {
  curves: readonly CurveRead[];
  value: string;
  onChange: (code: string) => void;
}

/** The "Curve" select: one option per catalogue curve, by name. */
export function CurveSelect({ curves, value, onChange }: CurveSelectProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>Curve</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="focus-ring w-96">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {curves.map((curve) =>
            curve.Code ? (
              <SelectItem key={curve.Code} value={curve.Code}>
                {curve.Name ?? curve.Code}
              </SelectItem>
            ) : null,
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
