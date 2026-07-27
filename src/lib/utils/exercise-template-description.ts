import type { ExerciseTemplate } from '@/lib/supabase/schemas/exercise-templates';
import type { DefaultValuesData } from '@/app/program/[id]/default-values/schemas';

/**
 * Get the value for a specific set index, using override if available, otherwise base value
 */
function getSetValue(
  baseValue: number | string | null,
  overrideArray: (number | string)[] | null,
  setIndex: number,
): number | string | null {
  if (overrideArray && overrideArray[setIndex] !== undefined) {
    const overrideValue = overrideArray[setIndex];
    // -1 means use default base value
    if (overrideValue === -1 || overrideValue === '-1') {
      return baseValue;
    }
    return overrideValue;
  }
  return baseValue;
}

/**
 * Format a value for display
 */
function formatValue(value: number | string | null, unit: string): string {
  if (value === null || value === undefined) {
    return '';
  }
  return `${value}${unit}`;
}

/**
 * Generate a description for an exercise template showing sets, reps, time, distance, weight, and rest_time
 * with override values per set
 */
export function generateExerciseTemplateDescription(
  template: ExerciseTemplate,
): string {
  const sets = template.sets || 0;
  if (sets === 0) {
    return 'No sets configured';
  }

  const parts: string[] = [`${sets} set${sets !== 1 ? 's' : ''}`];

  // Check if all sets are the same (no overrides or all overrides are identical)
  const hasOverrides =
    template.rep_override?.length ||
    template.time_override?.length ||
    template.distance_override?.length ||
    template.weight_override?.length ||
    template.rest_time_override?.length;

  let allSetsSame = !hasOverrides;

  if (hasOverrides) {
    // Check if all sets have the same values
    const firstSetValues = {
      reps: getSetValue(template.rep, template.rep_override, 0),
      time: getSetValue(template.time, template.time_override, 0),
      distance: getSetValue(template.distance, template.distance_override, 0),
      weight: getSetValue(template.weight, template.weight_override, 0),
      restTime: getSetValue(template.rest_time, template.rest_time_override, 0),
    };

    for (let i = 1; i < sets; i++) {
      const currentSetValues = {
        reps: getSetValue(template.rep, template.rep_override, i),
        time: getSetValue(template.time, template.time_override, i),
        distance: getSetValue(template.distance, template.distance_override, i),
        weight: getSetValue(template.weight, template.weight_override, i),
        restTime: getSetValue(
          template.rest_time,
          template.rest_time_override,
          i,
        ),
      };

      if (
        firstSetValues.reps !== currentSetValues.reps ||
        firstSetValues.time !== currentSetValues.time ||
        firstSetValues.distance !== currentSetValues.distance ||
        firstSetValues.weight !== currentSetValues.weight ||
        firstSetValues.restTime !== currentSetValues.restTime
      ) {
        allSetsSame = false;
        break;
      }
    }
  }

  // If all sets are the same, show coalesced format
  if (allSetsSame) {
    const setValues: string[] = [];
    const reps = template.rep;
    const time = template.time;
    const distance = template.distance;
    const weight = template.weight;
    const restTime = template.rest_time;

    if (reps !== null && reps !== undefined) {
      setValues.push(formatValue(reps, ' reps'));
    }
    if (time !== null && time !== undefined) {
      setValues.push(formatValue(time, 's'));
    }
    if (distance !== null && distance !== undefined && distance !== '') {
      setValues.push(formatValue(distance, ''));
    }
    if (weight !== null && weight !== undefined && weight !== '') {
      setValues.push(formatValue(weight, ''));
    }
    if (restTime !== null && restTime !== undefined) {
      setValues.push(formatValue(restTime, 's rest'));
    }

    if (setValues.length > 0) {
      parts.push(`: ${setValues.join(', ')}`);
    }
  } else {
    // Sets differ, show each set individually
    const setDescriptions: string[] = [];

    for (let i = 0; i < sets; i++) {
      const setParts: string[] = [`Set ${i + 1}`];

      const reps = getSetValue(template.rep, template.rep_override, i) as
        | number
        | null;
      const time = getSetValue(template.time, template.time_override, i) as
        | number
        | null;
      const distance = getSetValue(
        template.distance,
        template.distance_override,
        i,
      ) as string | null;
      const weight = getSetValue(
        template.weight,
        template.weight_override,
        i,
      ) as string | null;
      const restTime = getSetValue(
        template.rest_time,
        template.rest_time_override,
        i,
      ) as number | null;

      const setValues: string[] = [];

      if (reps !== null && reps !== undefined) {
        setValues.push(formatValue(reps, ' reps'));
      }
      if (time !== null && time !== undefined) {
        setValues.push(formatValue(time, 's'));
      }
      if (distance !== null && distance !== undefined && distance !== '') {
        setValues.push(formatValue(distance, ''));
      }
      if (weight !== null && weight !== undefined && weight !== '') {
        setValues.push(formatValue(weight, ''));
      }
      if (restTime !== null && restTime !== undefined) {
        setValues.push(formatValue(restTime, 's rest'));
      }

      if (setValues.length > 0) {
        setParts.push(` - ${setValues.join(', ')}`);
        setDescriptions.push(setParts.join(''));
      } else {
        setDescriptions.push(`Set ${i + 1}`);
      }
    }

    if (setDescriptions.length > 0) {
      parts.push(`: ${setDescriptions.join(' | ')}`);
    }
  }

  return parts.join('');
}

/**
 * Generate a description from default values (simplified, no overrides)
 */
export function generateDefaultValuesDescription(
  defaults: DefaultValuesData,
): string {
  const sets = defaults.sets || 0;
  if (sets === 0) {
    return 'No sets configured';
  }

  const parts: string[] = [`${sets} set${sets !== 1 ? 's' : ''}`];
  const setValues: string[] = [];

  if (defaults.rep !== null && defaults.rep !== undefined) {
    setValues.push(formatValue(defaults.rep, ' reps'));
  }
  if (defaults.time !== null && defaults.time !== undefined) {
    setValues.push(formatValue(defaults.time, 's'));
  }
  if (defaults.distance !== null && defaults.distance !== undefined && defaults.distance !== '') {
    const distanceWithUnit = `${defaults.distance}${defaults.distanceUnit || 'm'}`;
    setValues.push(distanceWithUnit);
  }
  if (defaults.weight !== null && defaults.weight !== undefined && defaults.weight !== '') {
    const weightWithUnit = `${defaults.weight}${defaults.weightUnit || 'kg'}`;
    setValues.push(weightWithUnit);
  }
  if (defaults.rest_time !== null && defaults.rest_time !== undefined) {
    setValues.push(formatValue(defaults.rest_time, 's rest'));
  }

  if (setValues.length > 0) {
    parts.push(`: ${setValues.join(', ')}`);
  }

  return parts.join('');
}
