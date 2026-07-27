'use client';

import type { ExerciseTemplate } from '@/lib/supabase/schemas/exercise-templates';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

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
 * Format a value for display with unit
 */
function formatValue(
  value: number | string | null,
  unit: string,
): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return `${value}${unit}`;
}

interface MetricData {
  label: string;
  values: (number | string | null)[];
  hasData: boolean;
  allSame: boolean;
}

interface ExerciseTemplateSetsTableProps {
  template: ExerciseTemplate;
  className?: string;
}

export function ExerciseTemplateSetsTable({
  template,
  className,
}: ExerciseTemplateSetsTableProps) {
  const sets = template.sets || 0;
  if (sets === 0) {
    return (
      <div className={cn('text-xs text-muted-foreground', className)}>
        No sets configured
      </div>
    );
  }

  // Format tempo as "4-2-8-X" (template-level, no per-set override)
  const tempoArr = template.tempo ?? [];
  const tempoFormatted =
    tempoArr.length === 4 && tempoArr.some((t) => t != null && t !== '')
      ? tempoArr.map((t) => t || 'X').join('-')
      : null;

  // Collect all set values for each metric
  const metrics: {
    reps: MetricData;
    time: MetricData;
    distance: MetricData;
    weight: MetricData;
    restTime: MetricData;
    tempo: MetricData;
  } = {
    reps: { label: 'Reps', values: [], hasData: false, allSame: false },
    time: { label: 'Time', values: [], hasData: false, allSame: false },
    distance: {
      label: 'Distance',
      values: [],
      hasData: false,
      allSame: false,
    },
    weight: { label: 'Weight', values: [], hasData: false, allSame: false },
    restTime: {
      label: 'Rest',
      values: [],
      hasData: false,
      allSame: false,
    },
    tempo: {
      label: 'Tempo',
      values: Array(sets).fill(tempoFormatted),
      hasData: tempoFormatted != null,
      allSame: true,
    },
  };

  // Gather values for all sets
  for (let i = 0; i < sets; i++) {
    metrics.reps.values.push(
      getSetValue(template.rep, template.rep_override, i) as number | null,
    );
    metrics.time.values.push(
      getSetValue(template.time, template.time_override, i) as number | null,
    );
    metrics.distance.values.push(
      getSetValue(template.distance, template.distance_override, i) as
        | string
        | null,
    );
    metrics.weight.values.push(
      getSetValue(template.weight, template.weight_override, i) as
        | string
        | null,
    );
    metrics.restTime.values.push(
      getSetValue(template.rest_time, template.rest_time_override, i) as
        | number
        | null,
    );
  }

  // Check which metrics have data and if all values are the same
  Object.values(metrics).forEach((metric) => {
    // Check if metric has any non-null values
    metric.hasData = metric.values.some(
      (val) => val !== null && val !== undefined && val !== '',
    );

    if (metric.hasData) {
      // Check if all values are the same
      const firstValue = metric.values[0];
      metric.allSame = metric.values.every(
        (val) => val === firstValue || (firstValue === null && val === null),
      );
    }
  });

  // Determine if any metric has different values (to decide header structure)
  const hasVaryingValues = Object.values(metrics).some(
    (metric) => metric.hasData && !metric.allSame,
  );

  // Get metrics that have data
  const metricsWithData = Object.values(metrics).filter(
    (metric) => metric.hasData,
  );

  if (metricsWithData.length === 0) {
    return (
      <div className={cn('text-xs text-muted-foreground', className)}>
        {sets} set{sets !== 1 ? 's' : ''}
      </div>
    );
  }

  return (
    <div className={cn('text-xs', className)}>
      <Table>
        <TableHeader>
          {hasVaryingValues ? (
            <>
              <TableRow>
                <TableHead
                  colSpan={sets + 1}
                  className="text-center font-medium text-foreground"
                >
                  Sets ({sets})
                </TableHead>
              </TableRow>
              <TableRow>
                <TableHead className="font-medium text-muted-foreground"></TableHead>
                {Array.from({ length: sets }, (_, i) => (
                  <TableHead
                    key={i}
                    className="text-center font-medium text-muted-foreground"
                  >
                    Set {i + 1}
                  </TableHead>
                ))}
              </TableRow>
            </>
          ) : (
            <>
              <TableRow>
                <TableHead
                  colSpan={sets + 1}
                  className="text-center font-medium text-foreground"
                >
                  Sets ({sets})
                </TableHead>
              </TableRow>
            </>
          )}
        </TableHeader>
        <TableBody>
          {metricsWithData.map((metric) => {
            const displayValue =
              metric.label === 'Reps'
                ? formatValue(metric.values[0], ' reps')
                : metric.label === 'Time'
                  ? formatValue(metric.values[0], 's')
                  : metric.label === 'Rest'
                    ? formatValue(metric.values[0], 's rest')
                    : metric.values[0];

            if (metric.allSame) {
              // Label in first column, value merged across remaining columns
              return (
                <TableRow key={metric.label}>
                  <TableCell className="font-medium text-foreground">
                    {metric.label}
                  </TableCell>
                  <TableCell
                    colSpan={sets}
                    className="text-center text-foreground font-medium"
                  >
                    {displayValue}
                  </TableCell>
                </TableRow>
              );
            } else {
              // Label in first column, individual cells for each set
              return (
                <TableRow key={metric.label}>
                  <TableCell className="font-medium text-foreground">
                    {metric.label}
                  </TableCell>
                  {metric.values.map((value, idx) => {
                    const cellDisplayValue =
                      metric.label === 'Reps'
                        ? formatValue(value, ' reps')
                        : metric.label === 'Time'
                          ? formatValue(value, 's')
                          : metric.label === 'Rest'
                            ? formatValue(value, 's rest')
                            : value;

                    return (
                      <TableCell
                        key={idx}
                        className="text-center text-muted-foreground"
                      >
                        {cellDisplayValue || '-'}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            }
          })}
        </TableBody>
      </Table>
    </div>
  );
}
