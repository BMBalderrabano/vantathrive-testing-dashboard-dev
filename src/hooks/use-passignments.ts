'use client';

import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import {
  getProgramAssignmentsPaginated,
  getProgramAssignmentById,
  deleteProgramAssignment,
  cloneProgramAssignment,
} from '@/app/program/actions';
import toast from 'react-hot-toast';
import type { ProgramAssignmentWithTemplate } from '@/lib/supabase/schemas/program-assignments';

/**
 * Query key factory for program assignments
 */
export const programAssignmentsKeys = {
  all: ['program-assignments'] as const,
  lists: () => [...programAssignmentsKeys.all, 'list'] as const,
  list: (filters: {
    search?: string;
    weeks?: number;
    pageSize: number;
    showAssigned?: boolean;
    organizationId?: string | null;
  }) => [...programAssignmentsKeys.lists(), filters] as const,
  infinite: (filters: {
    search?: string;
    weeks?: number;
    pageSize: number;
    showAssigned?: boolean;
    organizationId?: string | null;
  }) => [...programAssignmentsKeys.lists(), 'infinite', filters] as const,
  detail: (id: string | null | undefined) =>
    [...programAssignmentsKeys.all, 'detail', id] as const,
};

/**
 * Infinite query options factory for program assignments
 * Uses infiniteQueryOptions helper for type safety and reusability
 */
export function programAssignmentsInfiniteQueryOptions(
  search?: string,
  weeks?: number,
  pageSize: number = 16,
  showAssigned: boolean = false,
  organizationId?: string | null,
  initialData?: {
    pages: Array<{
      data: ProgramAssignmentWithTemplate[];
      page: number;
      pageSize: number;
      total: number;
      hasMore: boolean;
    }>;
    pageParams: number[];
  },
) {
  return infiniteQueryOptions({
    queryKey: programAssignmentsKeys.infinite({
      search,
      weeks,
      pageSize,
      showAssigned,
      organizationId,
    }),
    queryFn: async ({ pageParam }) => {
      const result = await getProgramAssignmentsPaginated(
        pageParam as number,
        pageSize,
        search,
        weeks,
        showAssigned,
        organizationId,
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.hasMore) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    ...(initialData && { initialData }),
  });
}

/**
 * Query options factory for program assignment detail
 * Uses queryOptions helper for type safety and reusability
 */
export function programAssignmentQueryOptions(
  id: string | null | undefined,
  initialData?: ProgramAssignmentWithTemplate | null,
) {
  return queryOptions({
    queryKey: programAssignmentsKeys.detail(id),
    queryFn: async () => {
      if (!id) return null;
      const result = await getProgramAssignmentById(id);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    },
    enabled: !!id,
    ...(initialData !== undefined && initialData !== null && { initialData }),
  });
}

export function useProgramAssignments(
  search?: string,
  weeks?: number,
  pageSize: number = 16,
  showAssigned: boolean = false,
  organizationId?: string | null,
  initialData?: {
    pages: Array<{
      data: ProgramAssignmentWithTemplate[];
      page: number;
      pageSize: number;
      total: number;
      hasMore: boolean;
    }>;
    pageParams: number[];
  },
) {
  const queryOptions = programAssignmentsInfiniteQueryOptions(
    search,
    weeks,
    pageSize,
    showAssigned,
    organizationId,
    initialData,
  );

  const query = useInfiniteQuery(queryOptions);

  // Flatten pages for component consumption
  const flattenedData: ProgramAssignmentWithTemplate[] =
    query.data?.pages.flatMap((page) => page.data) ?? [];

  return {
    ...query,
    assignments: flattenedData,
  };
}

export function useProgramAssignment(
  id: string | null | undefined,
  initialData?: ProgramAssignmentWithTemplate | null,
) {
  return useQuery(programAssignmentQueryOptions(id, initialData));
}

export function useDeleteProgramAssignment(
  search?: string,
  weeks?: number,
  pageSize: number = 16,
  showAssigned: boolean = false,
  organizationId?: string | null,
) {
  const queryClient = useQueryClient();
  const queryKey = programAssignmentsKeys.infinite({
    search,
    weeks,
    pageSize,
    showAssigned,
    organizationId,
  });

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const result = await deleteProgramAssignment(assignmentId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return assignmentId;
    },
    onMutate: async (assignmentId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(queryKey);

      // Optimistically remove the item from cache
      queryClient.setQueryData<{
        pages: Array<{
          data: ProgramAssignmentWithTemplate[];
          page: number;
          pageSize: number;
          total: number;
          hasMore: boolean;
        }>;
        pageParams: number[];
      }>(queryKey, (old) => {
        if (!old) return old;

        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            data: page.data.filter((item) => item.id !== assignmentId),
            total: Math.max(0, page.total - 1),
          })),
        };
      });

      // Show toast immediately
      toast.success('Program deleted successfully');

      return { previousData };
    },
    onError: (error, assignmentId, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast.error(error.message || 'Failed to delete program');
    },
    onSuccess: () => {
      // Invalidate queries to ensure consistency
      queryClient.invalidateQueries({
        queryKey: programAssignmentsKeys.lists(),
      });
    },
  });
}

type ProgramAssignmentsInfiniteData = {
  pages: Array<{
    data: ProgramAssignmentWithTemplate[];
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  }>;
  pageParams: number[];
};

export function useCloneProgramAssignment(
  search?: string,
  weeks?: number,
  pageSize: number = 16,
  showAssigned: boolean = false,
  organizationId?: string | null,
) {
  const queryClient = useQueryClient();
  const queryKey = programAssignmentsKeys.infinite({
    search,
    weeks,
    pageSize,
    showAssigned,
    organizationId,
  });

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const result = await cloneProgramAssignment(assignmentId);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.data.assignmentId;
    },
    onMutate: async (assignmentId) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData =
        queryClient.getQueryData<ProgramAssignmentsInfiniteData>(queryKey);
      if (!previousData?.pages.length) return { previousData };

      let source: ProgramAssignmentWithTemplate | undefined;
      for (const page of previousData.pages) {
        source = page.data.find((item) => item.id === assignmentId);
        if (source) break;
      }
      if (!source) return { previousData };

      const tempId = `temp-clone-${Date.now()}`;
      const placeholder: ProgramAssignmentWithTemplate = {
        ...source,
        id: tempId,
        status: 'template',
        user_id: null,
        profiles: null,
        start_date: null,
        end_date: null,
        program_template: {
          ...source.program_template,
          name: `${source.program_template.name} (clone)`,
        },
      };

      queryClient.setQueryData<ProgramAssignmentsInfiniteData>(
        queryKey,
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page, i) =>
              i === 0
                ? {
                    ...page,
                    data: [placeholder, ...page.data],
                    total: page.total + 1,
                  }
                : page,
            ),
          };
        },
      );
      toast.success('Program cloned successfully');
      return { previousData, tempId };
    },
    onError: (error, _assignmentId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast.error(error.message || 'Failed to clone program');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: programAssignmentsKeys.lists(),
      });
    },
  });
}
