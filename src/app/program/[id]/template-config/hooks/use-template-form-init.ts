'use client';

import { useEffect } from 'react';
import { UseFormReset } from 'react-hook-form';
import type { SelectedItem } from '../types';
import type { TemplateFormData } from '../schemas';
import { parseValueWithUnit } from '../utils';
import { TemplateConfigDefaultValues } from '../template-config';
import { useDefaultValues } from '../../default-values/use-default-values';

type ValidTemplateItem = Exclude<SelectedItem, { type: 'group' }>;

const isValidTemplateItem = (
  item: SelectedItem | null,
): item is ValidTemplateItem => {
  return item !== null && item.type !== 'group';
};

const getDefaultFormData = (sessionDefaults?: {
  sets: number;
  rep: number | null;
  time: number | null;
  distance: string | null;
  distanceUnit: string;
  weight: string | null;
  weightUnit: string;
  rest_time: number | null;
  tempo: (string | null)[];
}): TemplateFormData => ({
  sets: sessionDefaults?.sets ?? TemplateConfigDefaultValues.sets,
  rep: sessionDefaults?.rep ?? TemplateConfigDefaultValues.rep,
  time: sessionDefaults?.time ?? TemplateConfigDefaultValues.time,
  distance: sessionDefaults?.distance ?? null,
  distanceUnit: sessionDefaults?.distanceUnit ?? 'm',
  weight: sessionDefaults?.weight ?? null,
  weightUnit: sessionDefaults?.weightUnit ?? 'kg',
  rest_time:
    sessionDefaults?.rest_time ?? TemplateConfigDefaultValues.rest_time,
  tempo: (sessionDefaults?.tempo as [
    string | null,
    string | null,
    string | null,
    string | null,
  ]) ?? [null, null, null, null],
  rep_override: [],
  time_override: [],
  distance_override: [],
  distance_override_units: [],
  weight_override: [],
  weight_override_units: [],
  rest_time_override: [],
});

function initializeFormData(
  item: ValidTemplateItem | null,
  sessionDefaults?: ReturnType<typeof useDefaultValues>['values'],
): TemplateFormData {
  if (!item || item.type === 'exercise') {
    return getDefaultFormData(sessionDefaults);
  }

  const template = item.data;
  const sets = template.sets || 1;
  const distanceParsed = parseValueWithUnit(template.distance);
  const weightParsed = parseValueWithUnit(template.weight);

  const distanceOverrides = (template.distance_override || []).map((d) =>
    parseValueWithUnit(d),
  );
  const weightOverrides = (template.weight_override || []).map((w) =>
    parseValueWithUnit(w),
  );

  // Parse tempo from template (string[] of length 4)
  const tempo = template.tempo
    ? Array(4)
        .fill(null)
        .map((_, i) => template.tempo?.[i] ?? null)
    : [null, null, null, null];

  return {
    sets,
    rep: template.rep ?? null,
    time: template.time ?? null,
    distance: distanceParsed.value,
    distanceUnit: distanceParsed.unit || 'm',
    weight: weightParsed.value,
    weightUnit: weightParsed.unit || 'kg',
    rest_time: template.rest_time ?? null,
    tempo,
    rep_override: Array(sets)
      .fill(null)
      .map((_, i) => template.rep_override?.[i] ?? null),
    time_override: Array(sets)
      .fill(null)
      .map((_, i) => template.time_override?.[i] ?? null),
    distance_override: Array(sets)
      .fill(null)
      .map((_, i) => distanceOverrides[i]?.value ?? null),
    distance_override_units: Array(sets)
      .fill(null)
      .map((_, i) => distanceOverrides[i]?.unit || 'm'),
    weight_override: Array(sets)
      .fill(null)
      .map((_, i) => weightOverrides[i]?.value ?? null),
    weight_override_units: Array(sets)
      .fill(null)
      .map((_, i) => weightOverrides[i]?.unit || 'kg'),
    rest_time_override: Array(sets)
      .fill(null)
      .map((_, i) => template.rest_time_override?.[i] ?? null),
  };
}

interface UseTemplateFormInitProps {
  item: SelectedItem | null;
  reset: UseFormReset<TemplateFormData>;
}

export function useTemplateFormInit({ item, reset }: UseTemplateFormInitProps) {
  const { values: sessionDefaults } = useDefaultValues();

  useEffect(() => {
    const newFormData = initializeFormData(
      isValidTemplateItem(item) ? item : null,
      sessionDefaults,
    );
    reset(newFormData);
  }, [item, reset, sessionDefaults]);
}
