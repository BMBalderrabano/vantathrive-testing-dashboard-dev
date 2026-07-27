'use client';

import { useRef } from 'react';
import toast from 'react-hot-toast';
import { useUpdateExerciseTemplate } from '@/hooks/use-exercise-template-mutations';
import type { TemplateFormData } from '../schemas';
import type { SelectedItem } from '../types';
import { formatValueWithUnit } from '../utils';
import type { ExerciseTemplate } from '@/lib/supabase/schemas/exercise-templates';

type ValidTemplateItem = Exclude<SelectedItem, { type: 'group' }>;

const isValidTemplateItem = (
  item: SelectedItem | null,
): item is ValidTemplateItem => {
  return item !== null && item.type !== 'group';
};

const getExerciseId = (item: ValidTemplateItem): number => {
  return item.type === 'exercise' ? item.data.id : item.data.exercise_id;
};

const isMissingValue = (value: number | string | null | undefined): boolean => {
  return value === null || value === undefined || value === '';
};

function normalizeOverrideValues<T extends number | string>(
  overrides: Array<T | null | undefined>,
  sets: number,
) {
  return Array.from({ length: sets }, (_, idx) => overrides[idx] ?? null);
}

function buildMergedTemplate(
  item: ValidTemplateItem,
  variables: {
    exerciseId: number;
    sets?: number;
    rep?: number | null;
    time?: number | null;
    distance?: string | null;
    weight?: string | null;
    rest_time?: number | null;
    tempo?: string[] | null;
    rep_override?: number[] | null;
    time_override?: number[] | null;
    distance_override?: string[] | null;
    weight_override?: string[] | null;
    rest_time_override?: number[] | null;
  },
  data: { id: string; template_hash: string },
): ExerciseTemplate {
  const base: Partial<ExerciseTemplate> =
    item.type === 'template'
      ? { ...item.data }
      : {
          exercise_id: item.data.id,
          exercise_name: item.data.exercise_name,
          video_type: item.data.video_type,
          video_url: item.data.video_url ?? null,
        };
  const v = variables;
  const b = base;
  return {
    id: data.id,
    template_hash: data.template_hash,
    exercise_id: variables.exerciseId,
    exercise_name: base.exercise_name ?? '',
    video_type: base.video_type,
    video_url: base.video_url ?? null,
    notes: base.notes ?? null,
    sets: v.sets ?? b.sets ?? null,
    rep: v.rep !== undefined ? v.rep : (b.rep ?? null),
    time: v.time !== undefined ? v.time : (b.time ?? null),
    distance: v.distance !== undefined ? v.distance : (b.distance ?? null),
    weight: v.weight !== undefined ? v.weight : (b.weight ?? null),
    rest_time: v.rest_time !== undefined ? v.rest_time : (b.rest_time ?? null),
    tempo: v.tempo !== undefined ? v.tempo : (b.tempo ?? null),
    equipment_ids: base.equipment_ids ?? null,
    rep_override:
      v.rep_override !== undefined ? v.rep_override : (b.rep_override ?? null),
    time_override:
      v.time_override !== undefined
        ? v.time_override
        : (b.time_override ?? null),
    distance_override:
      v.distance_override !== undefined
        ? v.distance_override
        : (b.distance_override ?? null),
    weight_override:
      v.weight_override !== undefined
        ? v.weight_override
        : (b.weight_override ?? null),
    rest_time_override:
      v.rest_time_override !== undefined
        ? v.rest_time_override
        : (b.rest_time_override ?? null),
    created_at: base.created_at ?? null,
    updated_at: base.updated_at ?? null,
  } as ExerciseTemplate;
}

interface UseTemplateFormSubmitProps {
  item: SelectedItem | null;
  onSuccess?: () => void;
  onSaveStart?: () => void;
  onMutate?: (data: Partial<TemplateFormData>) => void;
  onSuccessWithTemplate?: (template: ExerciseTemplate) => void;
}

export function useTemplateFormSubmit({
  item,
  onSuccess,
  onSaveStart,
  onMutate,
  onSuccessWithTemplate,
}: UseTemplateFormSubmitProps) {
  const lastVariablesRef = useRef<
    Parameters<ReturnType<typeof useUpdateExerciseTemplate>['mutate']>[0] | null
  >(null);

  const updateMutation = useUpdateExerciseTemplate({
    onSuccess: (data) => {
      const variables = lastVariablesRef.current;
      if (
        onSuccessWithTemplate &&
        item &&
        isValidTemplateItem(item) &&
        data?.id &&
        data?.template_hash &&
        variables
      ) {
        const merged = buildMergedTemplate(item, variables, data);
        onSuccessWithTemplate(merged);
      }
      lastVariablesRef.current = null;
      onSuccess?.();
    },
  });

  const onSubmit = async (data: TemplateFormData) => {
    if (!isValidTemplateItem(item)) return;

    const exerciseId = getExerciseId(item);
    const sets = data.sets ?? 1;

    const repOverrideValues = normalizeOverrideValues(data.rep_override, sets);
    const timeOverrideValues = normalizeOverrideValues(data.time_override, sets);
    const distanceOverrideValues = normalizeOverrideValues(
      data.distance_override,
      sets,
    );
    const weightOverrideValues = normalizeOverrideValues(data.weight_override, sets);
    const restTimeOverrideValues = normalizeOverrideValues(
      data.rest_time_override,
      sets,
    );

    const hasRepOverrides = repOverrideValues.some((v) => !isMissingValue(v));
    const hasTimeOverrides = timeOverrideValues.some((v) => !isMissingValue(v));
    const hasDistanceOverrides = distanceOverrideValues.some(
      (v) => !isMissingValue(v),
    );
    const hasWeightOverrides = weightOverrideValues.some(
      (v) => !isMissingValue(v),
    );
    const hasRestTimeOverrides = restTimeOverrideValues.some(
      (v) => !isMissingValue(v),
    );

    const missingOverrideField =
      (hasRepOverrides &&
        isMissingValue(data.rep) &&
        repOverrideValues.some((v) => isMissingValue(v)) &&
        'reps') ||
      (hasTimeOverrides &&
        isMissingValue(data.time) &&
        timeOverrideValues.some((v) => isMissingValue(v)) &&
        'time') ||
      (hasDistanceOverrides &&
        isMissingValue(data.distance) &&
        distanceOverrideValues.some((v) => isMissingValue(v)) &&
        'distance') ||
      (hasWeightOverrides &&
        isMissingValue(data.weight) &&
        weightOverrideValues.some((v) => isMissingValue(v)) &&
        'weight') ||
      (hasRestTimeOverrides &&
        isMissingValue(data.rest_time) &&
        restTimeOverrideValues.some((v) => isMissingValue(v)) &&
        'rest') ||
      null;

    if (missingOverrideField) {
      toast.error(
        `Add ${missingOverrideField} for every set or set a base value first.`,
      );
      return;
    }

    const normalizedData: TemplateFormData = {
      ...data,
      sets,
      rep_override: repOverrideValues,
      time_override: timeOverrideValues,
      distance_override: distanceOverrideValues,
      distance_override_units: Array.from({ length: sets }, (_, idx) => {
        return data.distance_override_units[idx] ?? 'm';
      }),
      weight_override: weightOverrideValues,
      weight_override_units: Array.from({ length: sets }, (_, idx) => {
        return data.weight_override_units[idx] ?? 'kg';
      }),
      rest_time_override: restTimeOverrideValues,
    };

    onSaveStart?.();

    const distanceValue = formatValueWithUnit(
      normalizedData.distance ?? null,
      normalizedData.distanceUnit ?? 'm',
    );
    const weightValue = formatValueWithUnit(
      normalizedData.weight ?? null,
      normalizedData.weightUnit ?? 'kg',
    );

    const distanceOverrides = normalizedData.distance_override.map((val, idx) =>
      formatValueWithUnit(
        val,
        normalizedData.distance_override_units[idx] || 'm',
      ),
    );

    const weightOverrides = normalizedData.weight_override.map((val, idx) =>
      formatValueWithUnit(
        val,
        normalizedData.weight_override_units[idx] || 'kg',
      ),
    );

    const repOverrides: number[] = normalizedData.rep_override.map((v) =>
      v !== null && v !== undefined ? v : -1,
    );
    const timeOverrides: number[] = normalizedData.time_override.map((v) =>
      v !== null && v !== undefined ? v : -1,
    );
    const distanceOverridesFormatted: string[] = distanceOverrides.map(
      (v) => v ?? '-1',
    );
    const weightOverridesFormatted: string[] = weightOverrides.map(
      (v) => v ?? '-1',
    );
    const restTimeOverrides: number[] = normalizedData.rest_time_override.map(
      (v) => (v !== null && v !== undefined ? v : -1),
    );

    // Format tempo: convert to string[] of length 4, filter out nulls but maintain array length
    const tempoFormatted: string[] = normalizedData.tempo.map((v) => v ?? '');
    const hasTempo = tempoFormatted.some((v) => v !== '');

    // Call onMutate callback for optimistic UI updates
    onMutate?.(normalizedData);

    const templateId =
      item.type === 'template' && item.data.id?.trim()
        ? item.data.id
        : undefined;

    const variables = {
      exerciseId,
      templateId,
      sets: normalizedData.sets ?? undefined,
      rep: normalizedData.rep,
      time: normalizedData.time,
      distance: distanceValue,
      weight: weightValue,
      rest_time: normalizedData.rest_time,
      tempo: hasTempo ? tempoFormatted : null,
      rep_override: hasRepOverrides ? repOverrides : null,
      time_override: hasTimeOverrides ? timeOverrides : null,
      distance_override: hasDistanceOverrides
        ? distanceOverridesFormatted
        : null,
      weight_override: hasWeightOverrides ? weightOverridesFormatted : null,
      rest_time_override: hasRestTimeOverrides ? restTimeOverrides : null,
    };
    lastVariablesRef.current = variables;
    updateMutation.mutate(variables);
  };

  return {
    onSubmit,
    isSubmitting: updateMutation.isPending,
  };
}
