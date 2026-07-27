import {
  SupabaseQuery,
  type SupabaseSuccess,
  type SupabaseError,
} from '../query';
import { z } from 'zod';
import type { PaginatedResult } from './exercise-templates';

export const groupSchema = z.object({
  id: z.string(),
  title: z.string(),
  is_superset: z.boolean().nullable(),
  note: z.string().nullable(),
  exercise_template_ids: z.array(z.string()).nullable(),
  group_hash: z.string(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export type Group = z.infer<typeof groupSchema>;

export class GroupsQuery extends SupabaseQuery {
  /**
   * Get paginated groups with search and sort
   * @param page - Page number (1-indexed)
   * @param pageSize - Number of items per page
   * @param search - Search term for group title
   * @param sortBy - Sort field (default: 'updated_at')
   * @param sortOrder - Sort order ('asc' or 'desc', default: 'desc')
   * @returns Success with paginated data or error
   */
  public async getListPaginated(
    page: number = 1,
    pageSize: number = 20,
    search?: string,
    sortBy: string = 'updated_at',
    sortOrder: 'asc' | 'desc' = 'desc',
  ): Promise<SupabaseSuccess<PaginatedResult<Group>> | SupabaseError> {
    const supabase = await this.getClient('service_role');

    let query = supabase.from('groups').select('*', { count: 'exact' });

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    // Normalize/limit sort fields
    const normalizedSortBy =
      sortBy === 'exercise_name'
        ? 'title'
        : sortBy === 'name'
          ? 'title'
          : sortBy;

    const allowedSortFields = new Set(['updated_at', 'created_at', 'title']);
    const safeSortBy = allowedSortFields.has(normalizedSortBy)
      ? normalizedSortBy
      : 'updated_at';

    query = query.order(safeSortBy, { ascending: sortOrder === 'asc' });

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return this.parseResponsePostgresError(error, 'Failed to get groups');
    }

    if (!data) {
      return {
        success: true,
        data: {
          data: [],
          page,
          pageSize,
          total: 0,
          hasMore: false,
        },
      };
    }

    const result = groupSchema.array().safeParse(data);
    if (!result.success) {
      return this.parseResponseZodError(result.error);
    }

    const total = count ?? result.data.length;
    const hasMore = from + result.data.length < total;

    return {
      success: true,
      data: {
        data: result.data,
        page,
        pageSize,
        total,
        hasMore,
      },
    };
  }

  /**
   * Get group by ID
   * @param id - The group ID
   * @returns Success with group or error
   */
  public async getById(
    id: string,
  ): Promise<SupabaseSuccess<Group> | SupabaseError> {
    const supabase = await this.getClient('service_role');

    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return this.parseResponsePostgresError(error, 'Failed to get group');
    }

    if (!data) {
      return {
        success: false,
        error: 'Group not found',
      };
    }

    const result = groupSchema.safeParse(data);

    if (!result.success) {
      return this.parseResponseZodError(result.error);
    }

    return {
      success: true,
      data: result.data,
    };
  }

  /**
   * Get multiple groups by IDs
   * @param ids - Array of group IDs
   * @returns Success with groups map or error
   */
  public async getByIds(
    ids: string[],
  ): Promise<SupabaseSuccess<Map<string, Group>> | SupabaseError> {
    if (ids.length === 0) {
      return {
        success: true,
        data: new Map(),
      };
    }

    const supabase = await this.getClient('service_role');

    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .in('id', ids);

    if (error) {
      return this.parseResponsePostgresError(error, 'Failed to get groups');
    }

    if (!data || data.length === 0) {
      return {
        success: true,
        data: new Map(),
      };
    }

    // Create map
    const groupsMap = new Map<string, Group>();
    for (const item of data) {
      const result = groupSchema.safeParse(item);
      if (result.success) {
        groupsMap.set(item.id, result.data);
      }
    }

    return {
      success: true,
      data: groupsMap,
    };
  }

  /**
   * Upsert group via RPC function
   * @param data - The group data
   * @returns Success with group data or error
   */
  public async upsertGroup(data: {
    p_title: string;
    p_exercise_template_ids?: string[];
    p_is_superset?: boolean;
    p_note?: string;
  }): Promise<
    | {
        success: true;
        data: {
          id: string;
          group_hash: string;
          cloned: boolean;
          reference_count: number;
          original_id?: string;
        };
      }
    | { success: false; error: string }
  > {
    const supabase = await this.getClient('service_role');

    const { data: result, error } = await supabase.rpc('upsert_group', data);

    if (error) {
      console.error('Error calling upsert_group RPC:', error);
      return {
        success: false,
        error: error.message || 'Failed to upsert group',
      };
    }

    if (!result || (result as { success?: boolean }).success === false) {
      const errorResult = result as { message?: string; error?: string };
      const errorMessage =
        errorResult.message || errorResult.error || 'Failed to upsert group';
      console.error('Error from upsert_group SQL function:', result);
      return {
        success: false,
        error: errorMessage,
      };
    }

    return {
      success: true,
      data: {
        id: (result as { id: string }).id,
        group_hash: (result as { group_hash: string }).group_hash,
        cloned: (result as { cloned: boolean }).cloned,
        reference_count: (result as { reference_count: number }).reference_count,
        original_id: (result as { original_id?: string }).original_id,
      },
    };
  }
}
