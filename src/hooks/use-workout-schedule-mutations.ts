'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  upsertWorkoutSchedule,
  updateProgramSchedule,
  upsertGroup,
  upsertExerciseTemplate,
} from '@/app/program/actions';
import {
  workoutScheduleKeys,
  type WorkoutScheduleData,
} from './use-workout-schedule';
import { programAssignmentsKeys } from './use-passignments';
import type { ProgramAssignmentWithTemplate } from '@/lib/supabase/schemas/program-assignments';
import { convertSelectedItemsToDatabaseSchedule } from '@/app/program/[id]/workout-schedule/utils';
import type { SelectedItem } from '@/app/program/[id]/template-config/types';
import type { DefaultValuesData } from '@/app/program/[id]/default-values/schemas';
import toast from 'react-hot-toast';

interface UpsertWorkoutScheduleData {
  schedule: SelectedItem[][][];
  assignmentId: string;
  defaultValues: DefaultValuesData;
}

interface UseUpsertWorkoutScheduleOptions {
  onSuccess?: (data: { id: string; schedule_hash: string }) => void;
  suppressToast?: boolean;
}

/**
 * Mutation hook for upserting a workout schedule
 * Handles conversion from SelectedItem format to DatabaseSchedule format
 * Includes optimistic updates
 */
export function useUpsertWorkoutSchedule(
  options?: UseUpsertWorkoutScheduleOptions,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpsertWorkoutScheduleData) => {
      const updatedSchedule = [...data.schedule];
      if (updatedSchedule.length === 0) {
        updatedSchedule.push(Array.from({ length: 7 }, () => []));
      }
      for (let w = 0; w < updatedSchedule.length; w++) {
        while (updatedSchedule[w].length < 7) {
          updatedSchedule[w].push([]);
        }
      }

      const conversionResult = await convertSelectedItemsToDatabaseSchedule(
        updatedSchedule,
        upsertGroup,
        upsertExerciseTemplate,
        data.defaultValues,
      );

      if (!conversionResult.success) {
        throw new Error(conversionResult.error || 'Failed to convert schedule');
      }

      const result = await upsertWorkoutSchedule(conversionResult.data);

      if (!result.success) {
        throw new Error(result.error || 'Failed to save workout schedule');
      }

      return {
        id: result.data.id,
        schedule_hash: result.data.schedule_hash,
      };
    },
    onMutate: async (variables) => {
      const queryKey = workoutScheduleKeys.detail(variables.assignmentId);

      await queryClient.cancelQueries({ queryKey });

      const previousData =
        queryClient.getQueryData<WorkoutScheduleData>(queryKey);

      return { previousData };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(
          workoutScheduleKeys.detail(variables.assignmentId),
          context.previousData,
        );
      }
      if (!options?.suppressToast) {
        toast.error(error.message || 'Failed to save workout schedule');
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate queries to ensure consistency
      queryClient.invalidateQueries({
        queryKey: workoutScheduleKeys.detail(variables.assignmentId),
      });
      queryClient.invalidateQueries({
        queryKey: programAssignmentsKeys.detail(variables.assignmentId),
      });
      if (!options?.suppressToast) {
        toast.success('Workout schedule saved successfully');
      }
      options?.onSuccess?.(data);
    },
  });
}

interface UpdateProgramScheduleData {
  assignmentId: string;
  workoutScheduleId: string;
}

interface UseUpdateProgramScheduleOptions {
  onSuccess?: () => void;
  suppressToast?: boolean;
}

/**
 * Mutation hook for updating program assignment workout schedule ID
 * Includes optimistic updates
 */
export function useUpdateProgramSchedule(
  options?: UseUpdateProgramScheduleOptions,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateProgramScheduleData) => {
      const result = await updateProgramSchedule(
        data.assignmentId,
        data.workoutScheduleId,
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to update program assignment');
      }

      return data;
    },
    onMutate: async (variables) => {
      const queryKey = programAssignmentsKeys.detail(variables.assignmentId);

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(queryKey);

      // Optimistically update the cache
      queryClient.setQueryData(
        queryKey,
        (old: ProgramAssignmentWithTemplate | null | undefined) => {
          if (!old) return old;
          return {
            ...old,
            workout_schedule_id: variables.workoutScheduleId,
          };
        },
      );

      return { previousData };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(
          programAssignmentsKeys.detail(variables.assignmentId),
          context.previousData,
        );
      }
      if (!options?.suppressToast) {
        toast.error(error.message || 'Failed to update program assignment');
      }
    },
    onSuccess: (data) => {
      // Invalidate queries to ensure consistency
      queryClient.invalidateQueries({
        queryKey: programAssignmentsKeys.detail(data.assignmentId),
      });
      options?.onSuccess?.();
    },
  });
}
