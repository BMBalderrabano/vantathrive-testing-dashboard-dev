'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { SelectedItem } from '../types';
import type { TabType } from '../types';
import type { ExerciseTemplate } from '@/lib/supabase/schemas/exercise-templates';
import { parseValueWithUnit, formatValueWithUnit } from '../utils';
import { templateFormSchema, type TemplateFormData } from '../schemas';
import { TemplateConfigDefaultValues } from '../template-config';
import { useTemplateFormInit } from './use-template-form-init';
import { useTemplateFormSubmit } from './use-template-form-submit';

type ValidTemplateItem = Exclude<SelectedItem, { type: 'group' }>;

const isValidTemplateItem = (
  item: SelectedItem | null,
): item is ValidTemplateItem => {
  return item !== null && item.type !== 'group';
};

const getDefaultFormData = (): TemplateFormData => ({
  sets: TemplateConfigDefaultValues.sets,
  rep: TemplateConfigDefaultValues.rep,
  time: TemplateConfigDefaultValues.time,
  distance: null,
  distanceUnit: 'm',
  weight: null,
  weightUnit: 'kg',
  rest_time: TemplateConfigDefaultValues.rest_time,
  tempo: [null, null, null, null],
  rep_override: [],
  time_override: [],
  distance_override: [],
  distance_override_units: [],
  weight_override: [],
  weight_override_units: [],
  rest_time_override: [],
});

export function useTemplateForm(
  item: SelectedItem | null,
  onClose: () => void,
  copiedData: Partial<ExerciseTemplate> | null,
  onUpdate?: (data: Partial<ExerciseTemplate>) => void,
  onSuccessWithTemplate?: (template: ExerciseTemplate) => void,
  onSaveStart?: () => void,
) {
  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: getDefaultFormData(),
  });

  const { setValue, reset, control } = form;
  const formData = useWatch({ control });
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [currentSetIndex, setCurrentSetIndex] = useState(0);

  useTemplateFormInit({ item, reset });

  const { onSubmit, isSubmitting } = useTemplateFormSubmit({
    item,
    onSuccess: onClose,
    onSaveStart,
    onMutate: (data) => {
      // Transform form data for optimistic update
      if (!isValidTemplateItem(item) || !onUpdate) return;

      const exerciseId =
        item.type === 'exercise' ? item.data.id : item.data.exercise_id;

      const distanceValue = formatValueWithUnit(
        data.distance ?? formData.distance ?? null,
        data.distanceUnit ?? formData.distanceUnit ?? 'm',
      );
      const weightValue = formatValueWithUnit(
        data.weight ?? formData.weight ?? null,
        data.weightUnit ?? formData.weightUnit ?? 'kg',
      );

      const distanceOverrides = (
        data.distance_override ??
        formData.distance_override ??
        []
      ).map((val, idx) =>
        formatValueWithUnit(
          val,
          (data.distance_override_units ??
            formData.distance_override_units ??
            [])[idx] || 'm',
        ),
      );

      const weightOverrides = (
        data.weight_override ??
        formData.weight_override ??
        []
      ).map((val, idx) =>
        formatValueWithUnit(
          val,
          (data.weight_override_units ?? formData.weight_override_units ?? [])[
            idx
          ] || 'kg',
        ),
      );

      const repOverrides: number[] = (
        data.rep_override ??
        formData.rep_override ??
        []
      ).map((v) => (v !== null && v !== undefined ? v : -1));
      const timeOverrides: number[] = (
        data.time_override ??
        formData.time_override ??
        []
      ).map((v) => (v !== null && v !== undefined ? v : -1));
      const distanceOverridesFormatted: string[] = distanceOverrides.map(
        (v) => v ?? '-1',
      );
      const weightOverridesFormatted: string[] = weightOverrides.map(
        (v) => v ?? '-1',
      );
      const restTimeOverrides: number[] = (
        data.rest_time_override ??
        formData.rest_time_override ??
        []
      ).map((v) => (v !== null && v !== undefined ? v : -1));

      const hasRepOverrides = repOverrides.some((v) => v !== -1);
      const hasTimeOverrides = timeOverrides.some((v) => v !== -1);
      const hasDistanceOverrides = distanceOverridesFormatted.some(
        (v) => v !== '-1',
      );
      const hasWeightOverrides = weightOverridesFormatted.some(
        (v) => v !== '-1',
      );
      const hasRestTimeOverrides = restTimeOverrides.some((v) => v !== -1);

      const tempoFormatted: string[] = (data.tempo ?? formData.tempo ?? []).map(
        (v) => v ?? '',
      );
      const hasTempo = tempoFormatted.some((v) => v !== '');

      onUpdate({
        exercise_id: exerciseId,
        sets: data.sets ?? formData.sets ?? undefined,
        rep: data.rep ?? formData.rep ?? undefined,
        time: data.time ?? formData.time ?? undefined,
        distance: distanceValue,
        weight: weightValue,
        rest_time: data.rest_time ?? formData.rest_time ?? undefined,
        tempo: hasTempo ? tempoFormatted : null,
        rep_override: hasRepOverrides ? repOverrides : null,
        time_override: hasTimeOverrides ? timeOverrides : null,
        distance_override: hasDistanceOverrides
          ? distanceOverridesFormatted
          : null,
        weight_override: hasWeightOverrides ? weightOverridesFormatted : null,
        rest_time_override: hasRestTimeOverrides ? restTimeOverrides : null,
      });
    },
    onSuccessWithTemplate,
  });

  const handleSetsChange = (newSets: number) => {
    if (newSets < 1) return;
    const currentSets = formData.sets ?? TemplateConfigDefaultValues.sets;

    if (newSets > currentSets) {
      setValue('sets', newSets);
      setValue('rep_override', [
        ...(formData.rep_override ?? []),
        ...Array(newSets - currentSets).fill(null),
      ]);
      setValue('time_override', [
        ...(formData.time_override ?? []),
        ...Array(newSets - currentSets).fill(null),
      ]);
      setValue('distance_override', [
        ...(formData.distance_override ?? []),
        ...Array(newSets - currentSets).fill(null),
      ]);
      setValue('distance_override_units', [
        ...(formData.distance_override_units ?? []),
        ...Array(newSets - currentSets).fill('m'),
      ]);
      setValue('weight_override', [
        ...(formData.weight_override ?? []),
        ...Array(newSets - currentSets).fill(null),
      ]);
      setValue('weight_override_units', [
        ...(formData.weight_override_units ?? []),
        ...Array(newSets - currentSets).fill('kg'),
      ]);
      setValue('rest_time_override', [
        ...(formData.rest_time_override ?? []),
        ...Array(newSets - currentSets).fill(null),
      ]);
    } else {
      setValue('sets', newSets);
      setValue('rep_override', (formData.rep_override ?? []).slice(0, newSets));
      setValue(
        'time_override',
        (formData.time_override ?? []).slice(0, newSets),
      );
      setValue(
        'distance_override',
        (formData.distance_override ?? []).slice(0, newSets),
      );
      setValue(
        'distance_override_units',
        (formData.distance_override_units ?? []).slice(0, newSets),
      );
      setValue(
        'weight_override',
        (formData.weight_override ?? []).slice(0, newSets),
      );
      setValue(
        'weight_override_units',
        (formData.weight_override_units ?? []).slice(0, newSets),
      );
      setValue(
        'rest_time_override',
        (formData.rest_time_override ?? []).slice(0, newSets),
      );
    }

    if (currentSetIndex >= newSets) {
      setCurrentSetIndex(Math.max(0, newSets - 1));
    }
  };

  const setCurrentValue = (
    field: 'rep' | 'time' | 'rest_time' | 'distance' | 'weight',
    value: number | string | null,
  ) => {
    if (activeTab === 'all') {
      setValue(field, value as never);
    } else {
      const overrideFieldMap: Record<
        string,
        | 'rep_override'
        | 'time_override'
        | 'rest_time_override'
        | 'distance_override'
        | 'weight_override'
      > = {
        rep: 'rep_override',
        time: 'time_override',
        rest_time: 'rest_time_override',
        distance: 'distance_override',
        weight: 'weight_override',
      };
      const overrideField = overrideFieldMap[field];
      if (!overrideField) return;

      const currentSets = formData.sets ?? TemplateConfigDefaultValues.sets;
      const base = formData[overrideField] ?? [];
      const overrideArray = [...base];
      while (overrideArray.length < currentSets) overrideArray.push(null);
      overrideArray[currentSetIndex] = value;
      setValue(overrideField, overrideArray as never);
    }
  };

  const handleCopy = (onCopy: (data: Partial<ExerciseTemplate>) => void) => {
    const distanceValue = formatValueWithUnit(
      formData.distance ?? null,
      formData.distanceUnit ?? 'm',
    );
    const weightValue = formatValueWithUnit(
      formData.weight ?? null,
      formData.weightUnit ?? 'kg',
    );
    const distanceOverrides = (formData.distance_override ?? [])
      .map((val, idx) =>
        formatValueWithUnit(
          val,
          (formData.distance_override_units ?? [])[idx] || 'm',
        ),
      )
      .filter((v): v is string => v !== null);
    const weightOverrides = (formData.weight_override ?? [])
      .map((val, idx) =>
        formatValueWithUnit(
          val,
          (formData.weight_override_units ?? [])[idx] || 'kg',
        ),
      )
      .filter((v): v is string => v !== null);

    const tempoFormatted: string[] = (formData.tempo ?? []).map((v) => v ?? '');
    const hasTempo = tempoFormatted.some((v) => v !== '');

    onCopy({
      sets: formData.sets,
      rep: formData.rep ?? undefined,
      time: formData.time ?? undefined,
      distance: distanceValue ?? undefined,
      weight: weightValue ?? undefined,
      rest_time: formData.rest_time ?? undefined,
      tempo: hasTempo ? tempoFormatted : undefined,
      rep_override: (formData.rep_override ?? []).filter(
        (v): v is number => v !== null,
      ),
      time_override: (formData.time_override ?? []).filter(
        (v): v is number => v !== null,
      ),
      distance_override:
        distanceOverrides.length > 0 ? distanceOverrides : undefined,
      weight_override: weightOverrides.length > 0 ? weightOverrides : undefined,
      rest_time_override: (formData.rest_time_override ?? []).filter(
        (v): v is number => v !== null,
      ),
    });
  };

  const handlePaste = () => {
    if (!copiedData) return;

    if (copiedData.sets !== undefined && copiedData.sets !== null) {
      setValue('sets', copiedData.sets);
    }
    if (copiedData.rep !== undefined) setValue('rep', copiedData.rep);
    if (copiedData.time !== undefined) setValue('time', copiedData.time);
    if (copiedData.rest_time !== undefined)
      setValue('rest_time', copiedData.rest_time);

    if (copiedData.distance) {
      const parsed = parseValueWithUnit(copiedData.distance);
      setValue('distance', parsed.value);
      setValue('distanceUnit', parsed.unit || 'm');
    }

    if (copiedData.weight) {
      const parsed = parseValueWithUnit(copiedData.weight);
      setValue('weight', parsed.value);
      setValue('weightUnit', parsed.unit || 'kg');
    }

    const currentSets = formData.sets ?? TemplateConfigDefaultValues.sets;

    if (copiedData.rep_override && copiedData.rep_override.length > 0) {
      const repOverride = [...copiedData.rep_override.map((v) => v ?? null)];
      if (repOverride.length < currentSets) {
        setValue('rep_override', [
          ...repOverride,
          ...Array(currentSets - repOverride.length).fill(null),
        ]);
      } else if (repOverride.length > currentSets) {
        setValue('rep_override', repOverride.slice(0, currentSets));
      } else {
        setValue('rep_override', repOverride);
      }
    }

    if (copiedData.time_override && copiedData.time_override.length > 0) {
      const timeOverride = [...copiedData.time_override.map((v) => v ?? null)];
      if (timeOverride.length < currentSets) {
        setValue('time_override', [
          ...timeOverride,
          ...Array(currentSets - timeOverride.length).fill(null),
        ]);
      } else if (timeOverride.length > currentSets) {
        setValue('time_override', timeOverride.slice(0, currentSets));
      } else {
        setValue('time_override', timeOverride);
      }
    }

    if (
      copiedData.rest_time_override &&
      copiedData.rest_time_override.length > 0
    ) {
      const restTimeOverride = [
        ...copiedData.rest_time_override.map((v) => v ?? null),
      ];
      if (restTimeOverride.length < currentSets) {
        setValue('rest_time_override', [
          ...restTimeOverride,
          ...Array(currentSets - restTimeOverride.length).fill(null),
        ]);
      } else if (restTimeOverride.length > currentSets) {
        setValue('rest_time_override', restTimeOverride.slice(0, currentSets));
      } else {
        setValue('rest_time_override', restTimeOverride);
      }
    }

    if (
      copiedData.distance_override &&
      copiedData.distance_override.length > 0
    ) {
      const parsed = copiedData.distance_override.map((d) =>
        parseValueWithUnit(d ?? null),
      );
      const distanceOverride = parsed.map((p) => p.value || null);
      const distanceOverrideUnits = parsed.map((p) => p.unit || 'm');
      if (distanceOverride.length < currentSets) {
        setValue('distance_override', [
          ...distanceOverride,
          ...Array(currentSets - distanceOverride.length).fill(null),
        ]);
        setValue('distance_override_units', [
          ...distanceOverrideUnits,
          ...Array(currentSets - distanceOverrideUnits.length).fill('m'),
        ]);
      } else if (distanceOverride.length > currentSets) {
        setValue('distance_override', distanceOverride.slice(0, currentSets));
        setValue(
          'distance_override_units',
          distanceOverrideUnits.slice(0, currentSets),
        );
      } else {
        setValue('distance_override', distanceOverride);
        setValue('distance_override_units', distanceOverrideUnits);
      }
    }

    if (copiedData.weight_override && copiedData.weight_override.length > 0) {
      const parsed = copiedData.weight_override.map((w) =>
        parseValueWithUnit(w ?? null),
      );
      const weightOverride = parsed.map((p) => p.value || null);
      const weightOverrideUnits = parsed.map((p) => p.unit || 'kg');
      if (weightOverride.length < currentSets) {
        setValue('weight_override', [
          ...weightOverride,
          ...Array(currentSets - weightOverride.length).fill(null),
        ]);
        setValue('weight_override_units', [
          ...weightOverrideUnits,
          ...Array(currentSets - weightOverrideUnits.length).fill('kg'),
        ]);
      } else if (weightOverride.length > currentSets) {
        setValue('weight_override', weightOverride.slice(0, currentSets));
        setValue(
          'weight_override_units',
          weightOverrideUnits.slice(0, currentSets),
        );
      } else {
        setValue('weight_override', weightOverride);
        setValue('weight_override_units', weightOverrideUnits);
      }
    }

    if (copiedData.tempo && copiedData.tempo.length === 4) {
      setValue(
        'tempo',
        copiedData.tempo.map((v) => v ?? null) as [
          string | null,
          string | null,
          string | null,
          string | null,
        ],
      );
    }
  };

  return {
    form,
    formData,
    activeTab,
    setActiveTab,
    currentSetIndex,
    setCurrentSetIndex,
    handleSetsChange,
    setCurrentValue,
    handleCopy,
    handlePaste,
    onSubmit,
    isSubmitting,
  };
}
