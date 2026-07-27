'use client';

import { useQuery } from '@tanstack/react-query';
import { queryOptions } from '@tanstack/react-query';
import { getWorkoutScheduleData } from '@/app/program/actions';
import type { DatabaseSchedule } from '@/app/program/[id]/workout-schedule/utils';
import { mergeScheduleWithOverride } from '@/app/program/[id]/workout-schedule/utils';

export type WorkoutScheduleData = {
  schedule: DatabaseSchedule | null;
  patientOverride: DatabaseSchedule | null;
};

/**
 * Query key factory for workout schedules
 */
export const workoutScheduleKeys = {
  all: ['workout-schedules'] as const,
  lists: () => [...workoutScheduleKeys.all, 'list'] as const,
  detail: (assignmentId: string | null | undefined) =>
    [...workoutScheduleKeys.all, 'detail', assignmentId] as const,
};

/**
 * Query options factory for workout schedule
 * Uses queryOptions helper for type safety and reusability
 */
export function workoutScheduleQueryOptions(
  assignmentId: string | null | undefined,
  initialData?: WorkoutScheduleData | null,
) {
  return queryOptions({
    queryKey: workoutScheduleKeys.detail(assignmentId),
    queryFn: async () => {
      if (!assignmentId) return null;
      const result = await getWorkoutScheduleData(assignmentId);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    },
    enabled: !!assignmentId,
    ...(initialData !== undefined && initialData !== null && { initialData }),
  });
}

export function useWorkoutSchedule(
  assignmentId: string | null | undefined,
  initialData?: WorkoutScheduleData | null,
) {
  return useQuery(workoutScheduleQueryOptions(assignmentId, initialData));
}

/**
 * Hook to check if schedule has data using React Query selector
 * Returns boolean indicating if schedule data exists
 */
export function useHasScheduleData(assignmentId: string | null | undefined) {
  return useQuery({
    ...workoutScheduleQueryOptions(assignmentId),
    select: (data): boolean => {
      if (!data) return false;
      const { schedule: dbSchedule, patientOverride } = data;
      if (!dbSchedule && !patientOverride) return false;
      const merged = mergeScheduleWithOverride(
        dbSchedule as DatabaseSchedule | null,
        patientOverride as DatabaseSchedule | null,
      );
      return merged && merged.length > 0;
    },
  });
}
