'use client';

import {
  type QueryKey,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  upsertExerciseTemplate,
  editExerciseTemplate,
} from '@/app/program/actions';
import { exercisesKeys } from './use-exercises';
import toast from 'react-hot-toast';
import type { ExerciseTemplate } from '@/lib/supabase/schemas/exercise-templates';

interface UpdateExerciseTemplateData {
  exerciseId: number;
  templateId?: string;
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
}

/** RPC upsert_exercise_template success payload */
export interface UpsertExerciseTemplateResult {
  id: string;
  template_hash: string;
}

type MutationContext = {
  previousData: Array<[QueryKey, unknown]>;
};

interface UseUpdateExerciseTemplateOptions {
  onSuccess?: (data: UpsertExerciseTemplateResult) => void;
  onMutate?: (data: UpdateExerciseTemplateData) => void;
}

/**
 * Mutation hook for updating an exercise template
 */
export function useUpdateExerciseTemplate(
  options?: UseUpdateExerciseTemplateOptions,
) {
  const queryClient = useQueryClient();

  return useMutation<
    UpsertExerciseTemplateResult,
    Error,
    UpdateExerciseTemplateData,
    MutationContext
  >({
    mutationFn: async (data: UpdateExerciseTemplateData) => {
      const rpcPayload = {
        p_sets: data.sets,
        p_rep: data.rep,
        p_time: data.time,
        p_distance: data.distance,
        p_weight: data.weight,
        p_rest_time: data.rest_time,
        p_tempo: data.tempo,
        p_rep_override: data.rep_override,
        p_time_override: data.time_override,
        p_distance_override: data.distance_override,
        p_weight_override: data.weight_override,
        p_rest_time_override: data.rest_time_override,
      };

      if (data.templateId) {
        const result = await editExerciseTemplate({
          p_template_id: data.templateId,
          p_exercise_id: data.exerciseId,
          ...rpcPayload,
        });
        if (!result.success) {
          throw new Error(result.error || 'Failed to edit exercise template');
        }
        const payload = result.data as UpsertExerciseTemplateResult;
        return {
          id: payload.id ?? data.templateId,
          template_hash: payload.template_hash ?? '',
        };
      }

      const result = await upsertExerciseTemplate({
        p_exercise_id: data.exerciseId,
        ...rpcPayload,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to update exercise template');
      }

      const payload = result.data as UpsertExerciseTemplateResult;
      if (!payload?.id || !payload?.template_hash) {
        throw new Error('Invalid upsert_exercise_template response');
      }
      return payload;
    },
    onMutate: async (variables) => {
      // Call optional onMutate callback for optimistic UI updates
      options?.onMutate?.(variables);

      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: exercisesKeys.lists(),
      });

      // Snapshot previous value
      const previousData = queryClient.getQueriesData({
        queryKey: exercisesKeys.lists(),
      });

      // Optimistically update the cache for templatesInfinite queries
      queryClient.setQueriesData<{
        pages: Array<ExerciseTemplate[]>;
        pageParams: number[];
      }>(
        {
          queryKey: exercisesKeys.lists(),
        },
        (old) => {
          if (!old) return old;

          // For infinite queries, update all pages
          if ('pages' in old && Array.isArray(old.pages)) {
            return {
              ...old,
              pages: old.pages.map((page) => {
                if (!Array.isArray(page)) return page;

                return page.map((template) => {
                  const match = variables.templateId
                    ? template.id === variables.templateId
                    : template.exercise_id === variables.exerciseId;
                  if (match) {
                    const v = variables;
                    const t = template;
                    return {
                      ...template,
                      sets: v.sets ?? t.sets,
                      rep: v.rep !== undefined ? v.rep : t.rep,
                      time: v.time !== undefined ? v.time : t.time,
                      distance:
                        v.distance !== undefined ? v.distance : t.distance,
                      weight: v.weight !== undefined ? v.weight : t.weight,
                      rest_time:
                        v.rest_time !== undefined ? v.rest_time : t.rest_time,
                      tempo: v.tempo !== undefined ? v.tempo : t.tempo,
                      rep_override:
                        v.rep_override !== undefined
                          ? v.rep_override
                          : t.rep_override,
                      time_override:
                        v.time_override !== undefined
                          ? v.time_override
                          : t.time_override,
                      distance_override:
                        v.distance_override !== undefined
                          ? v.distance_override
                          : t.distance_override,
                      weight_override:
                        v.weight_override !== undefined
                          ? v.weight_override
                          : t.weight_override,
                      rest_time_override:
                        v.rest_time_override !== undefined
                          ? v.rest_time_override
                          : t.rest_time_override,
                    } as ExerciseTemplate;
                  }
                  return template;
                });
              }),
            };
          }

          return old;
        },
      );

      return { previousData };
    },
    onError: (error, _variables, context) => {
      if (context?.previousData) {
        for (const [queryKey, data] of context.previousData) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      toast.error(error.message || 'Failed to update exercise template');
    },
    onSuccess: (data: UpsertExerciseTemplateResult) => {
      queryClient.invalidateQueries({
        queryKey: exercisesKeys.lists(),
      });
      toast.success('Template updated successfully');
      options?.onSuccess?.(data);
    },
  });
}
