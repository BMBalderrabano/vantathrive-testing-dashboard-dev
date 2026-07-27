/**
 * Database schedule format: {exercises: [{id: string, type: "exercise_template" | "group"}]}[][]
 */
type DatabaseScheduleDay = {
  exercises: Array<{ id: string; type: 'exercise_template' | 'group' }>;
};

export type DatabaseSchedule = DatabaseScheduleDay[][];

/**
 * SelectedItem types from the UI
 */
import type { SelectedItem } from '@/app/program/[id]/template-config/types';
import type { DefaultValuesData } from '@/app/program/[id]/default-values/schemas';
import type { Exercise } from '@/lib/supabase/schemas/exercises';
import type { ExerciseTemplate } from '@/lib/supabase/schemas/exercise-templates';

/**
 * Merge base schedule with patient override
 * Only replaces base schedule items if override has exercises (length > 0)
 */
export function mergeScheduleWithOverride(
  baseSchedule: DatabaseSchedule | null,
  patientOverride: DatabaseSchedule | null | undefined,
): DatabaseSchedule {
  // If no base schedule, return empty or override if exists
  if (!baseSchedule) {
    return patientOverride || [];
  }

  // If no override, return base schedule
  if (!patientOverride) {
    return baseSchedule;
  }

  // Create a deep copy of base schedule
  const merged: DatabaseSchedule = baseSchedule.map((week) =>
    week.map((day) => ({ ...day, exercises: [...day.exercises] })),
  );

  // Merge override into base schedule
  for (let weekIndex = 0; weekIndex < patientOverride.length; weekIndex++) {
    const overrideWeek = patientOverride[weekIndex];
    if (!overrideWeek) continue;

    // Ensure merged schedule has enough weeks
    while (merged.length <= weekIndex) {
      merged.push([]);
    }

    for (let dayIndex = 0; dayIndex < overrideWeek.length; dayIndex++) {
      const overrideDay = overrideWeek[dayIndex];
      if (!overrideDay) continue;

      // Only replace if override has exercises (ignore empty arrays)
      if (overrideDay.exercises && overrideDay.exercises.length > 0) {
        // Ensure week has enough days
        while (merged[weekIndex].length <= dayIndex) {
          merged[weekIndex].push({ exercises: [] });
        }

        // Replace with override
        merged[weekIndex][dayIndex] = {
          exercises: [...overrideDay.exercises],
        };
      }
    }
  }

  return merged;
}

/**
 * Convert DatabaseSchedule format to 3D array format for RPC function
 * Converts [week][day] with {"exercises": [...]} to [week][day][items]
 * where items is a direct array of {id, type} objects
 */
export function formatScheduleDB(
  schedule: DatabaseSchedule,
): Array<Array<Array<{ id: string; type: 'exercise_template' | 'group' }>>> {
  // Handle empty schedule
  if (!schedule || schedule.length === 0) {
    return [[[], [], [], [], [], [], []]];
  }

  return schedule.map((week) => {
    // Ensure week has exactly 7 days
    const normalizedWeek: Array<
      Array<{ id: string; type: 'exercise_template' | 'group' }>
    > = [];

    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const day = week[dayIndex];

      // Extract exercises array from {"exercises": [...]} or use empty array
      if (day && day.exercises && Array.isArray(day.exercises)) {
        normalizedWeek.push([...day.exercises]);
      } else {
        normalizedWeek.push([]);
      }
    }

    return normalizedWeek;
  });
}

/**
 * Convert SelectedItem[][][] to DatabaseSchedule format
 * Upserts groups and exercises without IDs, then extracts only IDs and types
 * Returns both the database schedule and the updated schedule with IDs
 */
export async function convertSelectedItemsToDatabaseSchedule(
  schedule: SelectedItem[][][],
  upsertGroupFn: (data: {
    p_title: string;
    p_exercise_template_ids?: string[];
    p_is_superset?: boolean;
    p_note?: string;
  }) => Promise<
    { success: true; data: { id: string } } | { success: false; error: string }
  >,
  upsertExerciseTemplateFn: (data: {
    p_exercise_id: number;
    p_sets?: number;
    p_rep?: number;
    p_time?: number;
    p_distance?: string;
    p_weight?: string;
    p_rest_time?: number;
    p_tempo?: string[];
  }) => Promise<
    | { success: true; data: { id: string; template_hash: string } }
    | { success: false; error: string }
  >,
  defaultValues: DefaultValuesData,
): Promise<
  | {
      success: true;
      data: DatabaseSchedule;
      updatedSchedule: SelectedItem[][][];
    }
  | { success: false; error: string }
> {
  const dbSchedule: DatabaseSchedule = [];
  const updatedSchedule: SelectedItem[][][] = [];

  // Normalize schedule: ensure week 0 exists and each week has all 7 days
  const normalizedSchedule: SelectedItem[][][] =
    schedule.length === 0
      ? [[[], [], [], [], [], [], []]]
      : schedule.map((week) => {
          const normalizedWeek = [...(week || [])];
          while (normalizedWeek.length < 7) {
            normalizedWeek.push([]);
          }
          return normalizedWeek;
        });

  // Process each week
  for (let weekIndex = 0; weekIndex < normalizedSchedule.length; weekIndex++) {
    const week = normalizedSchedule[weekIndex];
    const dbWeek: DatabaseScheduleDay[] = [];
    const updatedWeek: SelectedItem[][] = [];

    // Process each day
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const day = week[dayIndex] || [];
      const dbDay: DatabaseScheduleDay = { exercises: [] };
      const updatedDay: SelectedItem[] = [];

      // Process each item
      for (const item of day) {
        // Handle exercises - upsert as templates with default values
        if (item.type === 'exercise') {
          const exercise = item.data as Exercise;

          // Format distance and weight with units
          const distanceValue = defaultValues.distance
            ? `${defaultValues.distance}${defaultValues.distanceUnit || 'm'}`
            : undefined;
          const weightValue = defaultValues.weight
            ? `${defaultValues.weight}${defaultValues.weightUnit || 'kg'}`
            : undefined;

          // Convert tempo to string array
          const tempoValue = defaultValues.tempo.every((t) => t === null)
            ? undefined
            : (defaultValues.tempo.map((t) => t ?? '') as string[]);

          // Upsert exercise template
          const result = await upsertExerciseTemplateFn({
            p_exercise_id: exercise.id,
            p_sets: defaultValues.sets,
            p_rep: defaultValues.rep ?? undefined,
            p_time: defaultValues.time ?? undefined,
            p_distance: distanceValue,
            p_weight: weightValue,
            p_rest_time: defaultValues.rest_time ?? undefined,
            p_tempo: tempoValue,
          });

          if (!result.success) {
            return {
              success: false,
              error: result.error || 'Failed to upsert exercise template',
            };
          }

          // Add to database schedule
          dbDay.exercises.push({
            id: result.data.id,
            type: 'exercise_template',
          });

          // Create template item for updated schedule
          const templateItem: SelectedItem = {
            type: 'template',
            data: {
              id: result.data.id,
              template_hash: result.data.template_hash,
              exercise_id: exercise.id,
              exercise_name: exercise.exercise_name,
              video_type: exercise.video_type,
              video_url: exercise.video_url ?? null,
              thumbnail_url: exercise.thumbnail_url ?? undefined,
              notes: null,
              sets: defaultValues.sets,
              rep: defaultValues.rep,
              time: defaultValues.time,
              distance: defaultValues.distance,
              weight: defaultValues.weight,
              rest_time: defaultValues.rest_time,
              tempo: defaultValues.tempo as string[] | null,
              equipment_ids: null,
              rep_override: null,
              time_override: null,
              distance_override: null,
              weight_override: null,
              rest_time_override: null,
              created_at: null,
              updated_at: null,
            } as ExerciseTemplate,
          };

          updatedDay.push(templateItem);
          continue;
        }

        // Handle templates
        if (item.type === 'template') {
          // Skip templates with empty or invalid IDs
          if (!item.data.id || item.data.id.trim() === '') {
            continue;
          }
          dbDay.exercises.push({
            id: item.data.id,
            type: 'exercise_template',
          });
          updatedDay.push(item);
          continue;
        }

        // Handle groups
        if (item.type === 'group') {
          let groupId = item.data.id;

          // If group doesn't have an ID or has empty string, upsert it first
          if (!groupId || groupId.trim() === '') {
            const exerciseTemplateIds: string[] = [];
            const items = item.data.items ?? [];

            const distanceValue = defaultValues.distance
              ? `${defaultValues.distance}${defaultValues.distanceUnit || 'm'}`
              : undefined;
            const weightValue = defaultValues.weight
              ? `${defaultValues.weight}${defaultValues.weightUnit || 'kg'}`
              : undefined;
            const tempoValue = defaultValues.tempo.every((t) => t === null)
              ? undefined
              : (defaultValues.tempo.map((t) => t ?? '') as string[]);

            for (const groupItem of items) {
              if (
                typeof groupItem !== 'object' ||
                groupItem === null ||
                !('type' in groupItem)
              )
                continue;

              if (groupItem.type === 'template') {
                const d = groupItem.data;
                if (
                  d &&
                  typeof d === 'object' &&
                  typeof (d as { id?: unknown }).id === 'string' &&
                  (d as { id: string }).id.trim() !== ''
                ) {
                  exerciseTemplateIds.push((d as { id: string }).id);
                }
                continue;
              }

              if (groupItem.type === 'exercise') {
                const exercise = groupItem.data as Exercise;
                const res = await upsertExerciseTemplateFn({
                  p_exercise_id: exercise.id,
                  p_sets: defaultValues.sets,
                  p_rep: defaultValues.rep ?? undefined,
                  p_time: defaultValues.time ?? undefined,
                  p_distance: distanceValue,
                  p_weight: weightValue,
                  p_rest_time: defaultValues.rest_time ?? undefined,
                  p_tempo: tempoValue,
                });
                if (!res.success) {
                  return {
                    success: false,
                    error:
                      res.error ||
                      'Failed to upsert exercise template in group',
                  };
                }
                exerciseTemplateIds.push(res.data.id);
              }
            }

            const result = await upsertGroupFn({
              p_title: item.data.name || '',
              p_exercise_template_ids: exerciseTemplateIds,
              p_is_superset: item.data.isSuperset ?? false,
            });

            if (!result.success) {
              return {
                success: false,
                error: result.error || 'Failed to upsert group',
              };
            }

            groupId = result.data.id;
          }

          // Skip groups with empty or invalid IDs
          if (!groupId || groupId.trim() === '') {
            continue;
          }

          dbDay.exercises.push({
            id: groupId,
            type: 'group',
          });

          // Update the item with the group ID
          updatedDay.push({
            ...item,
            data: {
              ...item.data,
              id: groupId,
            },
          });
        }
      }

      dbWeek.push(dbDay);
      updatedWeek.push(updatedDay);
    }

    dbSchedule.push(dbWeek);
    updatedSchedule.push(updatedWeek);
  }

  return {
    success: true,
    data: dbSchedule,
    updatedSchedule,
  };
}
