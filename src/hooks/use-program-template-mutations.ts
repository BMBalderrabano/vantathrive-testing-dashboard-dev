'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createProgramTemplate,
  updateProgramTemplate,
} from '@/app/program/actions';
import { programAssignmentsKeys } from './use-passignments';
import toast from 'react-hot-toast';
import { formatDateForDB } from '@/lib/utils';
import type { ProgramTemplate } from '@/lib/supabase/schemas/program-templates';
import type { ProgramAssignmentWithTemplate } from '@/lib/supabase/schemas/program-assignments';

interface CreateProgramTemplateData {
  name: string;
  weeks: number;
  startDate?: Date;
  description?: string | null;
  goals?: string | null;
  notes?: string | null;
  organizationId?: string | null;
}

interface UpdateProgramTemplateData {
  templateId: string;
  name: string;
  weeks: number;
  startDate?: Date;
  endDate?: Date;
  description?: string | null;
  goals?: string | null;
  notes?: string | null;
  organizationId?: string | null;
}

interface UseCreateProgramTemplateOptions {
  onSuccess?: () => void;
}

interface UseUpdateProgramTemplateOptions {
  onSuccess?: () => void;
  suppressToast?: boolean;
}

export function useCreateProgramTemplate(
  options?: UseCreateProgramTemplateOptions,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProgramTemplateData) => {
      const startDateString = data.startDate
        ? formatDateForDB(data.startDate)
        : null;

      const createResult = await createProgramTemplate(
        data.name.trim(),
        data.weeks,
        startDateString,
        data.description?.trim() || null,
        data.goals?.trim() || null,
        data.notes?.trim() || null,
        data.organizationId ?? null,
      );

      if (!createResult.success) {
        throw new Error(createResult.error || 'Failed to create program');
      }

      return createResult.data;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: programAssignmentsKeys.lists(),
      });
      const previousData = queryClient.getQueriesData({
        queryKey: programAssignmentsKeys.lists(),
      });
      return { previousData };
    },
    onError: (error, __variables, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error(error.message || 'Failed to create program');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: programAssignmentsKeys.lists(),
      });
      toast.success('Program created successfully');
      options?.onSuccess?.();
    },
  });
}

export function useUpdateProgramTemplate(
  options?: UseUpdateProgramTemplateOptions,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateProgramTemplateData) => {
      const startDateString = data.startDate
        ? formatDateForDB(data.startDate)
        : null;
      const endDateString = data.endDate ? formatDateForDB(data.endDate) : null;

      const updateResult = await updateProgramTemplate(
        data.templateId,
        data.name.trim(),
        data.weeks,
        data.description?.trim() || null,
        data.goals?.trim() || null,
        data.notes?.trim() || null,
        startDateString,
        endDateString,
      );

      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Failed to update program');
      }

      return updateResult.data;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey: programAssignmentsKeys.lists(),
      });

      const previousData = queryClient.getQueriesData({
        queryKey: programAssignmentsKeys.lists(),
      });

      queryClient.setQueriesData<{
        pages: Array<{
          data: ProgramAssignmentWithTemplate[];
          page: number;
          pageSize: number;
          total: number;
          hasMore: boolean;
        }>;
        pageParams: number[];
      }>(
        {
          queryKey: programAssignmentsKeys.lists(),
        },
        (old) => {
          if (!old) return old;

          if ('pages' in old && Array.isArray(old.pages)) {
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                data: page.data.map((item) => {
                  if (item.program_template?.id === variables.templateId) {
                    const startDateString = variables.startDate
                      ? formatDateForDB(variables.startDate)
                      : null;
                    const endDateString = variables.endDate
                      ? formatDateForDB(variables.endDate)
                      : null;
                    return {
                      ...item,
                      start_date: startDateString,
                      end_date: endDateString,
                      program_template: {
                        ...item.program_template,
                        name: variables.name,
                        weeks: variables.weeks,
                        description: variables.description || null,
                        goals: variables.goals || null,
                        notes: variables.notes || null,
                      } as ProgramTemplate,
                    };
                  }
                  return item;
                }),
              })),
            };
          }

          return old;
        },
      );

      return { previousData };
    },
    onError: (error, __variables, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (!options?.suppressToast) {
        toast.error(error.message || 'Failed to update program');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: programAssignmentsKeys.all,
      });
      if (!options?.suppressToast) {
        toast.success('Program updated successfully');
      }
      options?.onSuccess?.();
    },
  });
}
