'use client';

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import {
  getExercisesPaginated,
  getExerciseTemplatesPaginated,
  getExerciseTemplatesByIds,
  getGroupsPaginated,
  getExerciseTypes,
} from '@/app/program/actions';
import type { Exercise } from '@/lib/supabase/schemas/exercises';
import type { ExerciseTemplate } from '@/lib/supabase/schemas/exercise-templates';
import type { Group as DbGroup } from '@/lib/supabase/queries/groups';

/**
 * Query key factory for exercises
 */
export const exercisesKeys = {
  all: ['exercises'] as const,
  lists: () => [...exercisesKeys.all, 'list'] as const,
  detail: (id: string) => [...exercisesKeys.all, 'detail', id] as const,
  infinite: (filters: {
    search?: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    pageSize: number;
    type?: string | null;
  }) => [...exercisesKeys.lists(), 'infinite', filters] as const,
  types: () => [...exercisesKeys.all, 'types'] as const,
  templatesInfinite: (filters: {
    search?: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    pageSize: number;
  }) => [...exercisesKeys.lists(), 'templates-infinite', filters] as const,
  templatesByIds: (ids: string[]) =>
    [...exercisesKeys.lists(), 'templates-by-ids', ids] as const,
  groupsInfinite: (filters: {
    search?: string;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    pageSize: number;
  }) => [...exercisesKeys.lists(), 'groups-infinite', filters] as const,
};

export function useExerciseTypes() {
  return useQuery<string[], Error>({
    queryKey: exercisesKeys.types(),
    queryFn: async () => {
      const result = await getExerciseTypes();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  });
}

export function useExercisesInfinite(
  search?: string,
  sortBy: string = 'updated_at',
  sortOrder: 'asc' | 'desc' = 'desc',
  pageSize: number = 20,
  type?: string | null,
) {
  return useInfiniteQuery<Exercise[], Error>({
    queryKey: exercisesKeys.infinite({
      search,
      sortBy,
      sortOrder,
      pageSize,
      type,
    }),
    queryFn: async ({ pageParam = 1 }) => {
      const result = await getExercisesPaginated(
        pageParam as number,
        pageSize,
        search,
        sortBy,
        sortOrder,
        type,
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      // If last page has fewer items than pageSize, we've reached the end
      if (lastPage.length < pageSize) {
        return undefined;
      }
      // Otherwise, fetch next page
      return (lastPageParam as number) + 1;
    },
  });
}

export function useExerciseTemplatesInfinite(
  search?: string,
  sortBy: string = 'updated_at',
  sortOrder: 'asc' | 'desc' = 'desc',
  pageSize: number = 20,
) {
  return useInfiniteQuery<ExerciseTemplate[], Error>({
    queryKey: exercisesKeys.templatesInfinite({
      search,
      sortBy,
      sortOrder,
      pageSize,
    }),
    queryFn: async ({ pageParam = 1 }) => {
      const result = await getExerciseTemplatesPaginated(
        pageParam as number,
        pageSize,
        search,
        sortBy,
        sortOrder,
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      // If last page has fewer items than pageSize, we've reached the end
      if (lastPage.length < pageSize) {
        return undefined;
      }
      // Otherwise, fetch next page
      return (lastPageParam as number) + 1;
    },
  });
}

export function useExerciseTemplatesByIds(ids: string[]) {
  const stableIds = Array.from(new Set(ids)).sort();

  return useQuery<ExerciseTemplate[], Error>({
    queryKey: exercisesKeys.templatesByIds(stableIds),
    enabled: stableIds.length > 0,
    queryFn: async () => {
      const result = await getExerciseTemplatesByIds(stableIds);

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data;
    },
  });
}

export function useGroupsInfinite(
  search?: string,
  sortBy: string = 'updated_at',
  sortOrder: 'asc' | 'desc' = 'desc',
  pageSize: number = 20,
) {
  return useInfiniteQuery<DbGroup[], Error>({
    queryKey: exercisesKeys.groupsInfinite({
      search,
      sortBy,
      sortOrder,
      pageSize,
    }),
    queryFn: async ({ pageParam = 1 }) => {
      const result = await getGroupsPaginated(
        pageParam as number,
        pageSize,
        search,
        sortBy,
        sortOrder,
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      return result.data.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam) => {
      if (lastPage.length < pageSize) {
        return undefined;
      }
      return (lastPageParam as number) + 1;
    },
  });
}
