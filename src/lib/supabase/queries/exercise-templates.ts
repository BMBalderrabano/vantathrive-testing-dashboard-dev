import {
  SupabaseQuery,
  type SupabaseSuccess,
  type SupabaseError,
} from '../query';
import type { Database } from '../database.types';
import {
  exerciseTemplateSchema,
  type ExerciseTemplate,
} from '../schemas/exercise-templates';

export type PaginatedResult<T> = {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
};

export class ExerciseTemplatesQuery extends SupabaseQuery {
  /**
   * Get paginated exercise templates with search and sort
   * @param page - Page number (1-indexed)
   * @param pageSize - Number of items per page
   * @param search - Search term for exercise name
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
  ): Promise<
    SupabaseSuccess<PaginatedResult<ExerciseTemplate>> | SupabaseError
  > {
    const supabase = await this.getClient('service_role');

    let query = supabase.from('exercise_templates').select(
      `
        *,
        exercises!exercise_templates_exercise_id_fkey (
          exercise_name,
          video_type,
          video_url,
          thumbnail_url
        )
      `,
      { count: 'exact' },
    );

    // Note: Search filtering on joined table will be done in application layer

    // Apply sorting (only for fields on exercise_templates table)
    // For exercise_name, we'll sort in application layer
    if (sortBy !== 'exercise_name') {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });
    } else {
      // Default to updated_at for database query, then sort by name in app layer
      query = query.order('updated_at', { ascending: false });
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return this.parseResponsePostgresError(
        error,
        'Failed to get exercise templates',
      );
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

    // Transform data to include exercise_name, video_type, video_url, thumbnail_url and filter by search if needed
    let transformedData = data.map((item) => {
      const exercise = Array.isArray(item.exercises)
        ? item.exercises[0]
        : item.exercises;
      return {
        ...item,
        exercise_name: exercise?.exercise_name || '',
        video_type: exercise?.video_type || undefined,
        video_url: exercise?.video_url || undefined,
        thumbnail_url: exercise?.thumbnail_url ?? undefined,
      };
    });

    // Apply search filter in application layer
    if (search) {
      transformedData = transformedData.filter((item) =>
        item.exercise_name?.toLowerCase().includes(search.toLowerCase()),
      );
    }

    // Apply sorting by exercise_name if needed (in application layer)
    if (sortBy === 'exercise_name') {
      transformedData.sort((a, b) => {
        const aName = a.exercise_name || '';
        const bName = b.exercise_name || '';
        const comparison = aName.localeCompare(bName);
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    const result = exerciseTemplateSchema.array().safeParse(transformedData);

    if (!result.success) {
      return this.parseResponseZodError(result.error);
    }

    // Adjust total count if search was applied
    const adjustedTotal = search ? result.data.length : count || 0;
    const hasMore = search
      ? false // Can't determine hasMore with client-side filtering
      : from + result.data.length < adjustedTotal;

    return {
      success: true,
      data: {
        data: result.data,
        page,
        pageSize,
        total: adjustedTotal,
        hasMore,
      },
    };
  }

  /**
   * Get exercise template by ID
   * @param id - The exercise template ID
   * @returns Success with exercise template or error
   */
  public async getById(
    id: string,
  ): Promise<SupabaseSuccess<ExerciseTemplate> | SupabaseError> {
    const supabase = await this.getClient('service_role');

    const { data, error } = await supabase
      .from('exercise_templates')
      .select(
        `
        *,
        exercises!exercise_templates_exercise_id_fkey (
          exercise_name,
          video_type,
          video_url,
          thumbnail_url
        )
      `,
      )
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return this.parseResponsePostgresError(
        error,
        'Failed to get exercise template',
      );
    }

    if (!data) {
      return {
        success: false,
        error: 'Exercise template not found',
      };
    }

    // Transform data to include exercise_name, video_type, video_url, thumbnail_url
    const exercise = Array.isArray(data.exercises)
      ? data.exercises[0]
      : data.exercises;
    const transformedData = {
      ...data,
      exercise_name: exercise?.exercise_name || '',
      video_type: exercise?.video_type || undefined,
      video_url: exercise?.video_url || undefined,
      thumbnail_url: exercise?.thumbnail_url ?? undefined,
    };

    const result = exerciseTemplateSchema.safeParse(transformedData);

    if (!result.success) {
      return this.parseResponseZodError(result.error);
    }

    return {
      success: true,
      data: result.data,
    };
  }

  /**
   * Get multiple exercise templates by IDs
   * @param ids - Array of exercise template IDs
   * @returns Success with exercise templates map or error
   */
  public async getByIds(
    ids: string[],
  ): Promise<SupabaseSuccess<Map<string, ExerciseTemplate>> | SupabaseError> {
    if (ids.length === 0) {
      return {
        success: true,
        data: new Map(),
      };
    }

    const supabase = await this.getClient('service_role');

    const { data, error } = await supabase
      .from('exercise_templates')
      .select(
        `
        *,
        exercises!exercise_templates_exercise_id_fkey (
          exercise_name,
          video_type,
          video_url,
          thumbnail_url
        )
      `,
      )
      .in('id', ids);

    if (error) {
      return this.parseResponsePostgresError(
        error,
        'Failed to get exercise templates',
      );
    }

    if (!data || data.length === 0) {
      return {
        success: true,
        data: new Map(),
      };
    }

    // Transform data and create map
    const templatesMap = new Map<string, ExerciseTemplate>();
    for (const item of data) {
      const exercise = Array.isArray(item.exercises)
        ? item.exercises[0]
        : item.exercises;
      const transformedData = {
        ...item,
        exercise_name: exercise?.exercise_name || '',
        video_type: exercise?.video_type || undefined,
        video_url: exercise?.video_url || undefined,
        thumbnail_url: exercise?.thumbnail_url ?? undefined,
      };

      const result = exerciseTemplateSchema.safeParse(transformedData);
      if (result.success) {
        templatesMap.set(item.id, result.data);
      }
    }

    return {
      success: true,
      data: templatesMap,
    };
  }

  /**
   * Upsert exercise template via RPC function
   * @param data - The exercise template data
   * @returns Success with result or error
   */
  public async upsertExerciseTemplate(data: {
    p_exercise_id: number;
    p_sets?: number;
    p_rep?: number | null;
    p_time?: number | null;
    p_distance?: string | null;
    p_weight?: string | null;
    p_rest_time?: number | null;
    p_tempo?: string[] | null;
    p_rep_override?: number[] | null;
    p_time_override?: number[] | null;
    p_distance_override?: string[] | null;
    p_weight_override?: string[] | null;
    p_rest_time_override?: number[] | null;
    p_equipment_ids?: number[];
    p_notes?: string;
  }): Promise<SupabaseSuccess<unknown> | SupabaseError> {
    const supabase = await this.getClient('service_role');

    type RpcArgs = Database['public']['Functions']['upsert_exercise_template']['Args'];
    const { data: result, error } = await supabase.rpc(
      'upsert_exercise_template',
      data as RpcArgs,
    );

    if (error) {
      console.error('Error calling upsert_exercise_template RPC:', error);
      return {
        success: false,
        error: error.message || 'Failed to upsert exercise template',
      };
    }

    if (!result || (result as { success?: boolean }).success === false) {
      const errorResult = result as { message?: string; error?: string };
      const errorMessage =
        errorResult.message ||
        errorResult.error ||
        'Failed to upsert exercise template';
      console.error(
        'Error from upsert_exercise_template SQL function:',
        result,
      );
      return {
        success: false,
        error: errorMessage,
      };
    }

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Edit existing exercise template via RPC (updates the specific row by id)
   */
  public async editExerciseTemplate(data: {
    p_template_id: string;
    p_exercise_id: number;
    p_sets?: number;
    p_rep?: number | null;
    p_time?: number | null;
    p_distance?: string | null;
    p_weight?: string | null;
    p_rest_time?: number | null;
    p_tempo?: string[] | null;
    p_rep_override?: number[] | null;
    p_time_override?: number[] | null;
    p_distance_override?: string[] | null;
    p_weight_override?: string[] | null;
    p_rest_time_override?: number[] | null;
    p_equipment_ids?: number[];
    p_notes?: string;
  }): Promise<SupabaseSuccess<unknown> | SupabaseError> {
    const supabase = await this.getClient('service_role');

    type RpcArgs = Database['public']['Functions']['edit_exercise_template']['Args'];
    const { data: result, error } = await supabase.rpc(
      'edit_exercise_template',
      data as RpcArgs,
    );

    if (error) {
      console.error('Error calling edit_exercise_template RPC:', error);
      return {
        success: false,
        error: error.message || 'Failed to edit exercise template',
      };
    }

    if (!result || (result as { success?: boolean }).success === false) {
      const errorResult = result as { message?: string; error?: string };
      const errorMessage =
        errorResult.message ||
        errorResult.error ||
        'Failed to edit exercise template';
      console.error(
        'Error from edit_exercise_template SQL function:',
        result,
      );
      return {
        success: false,
        error: errorMessage,
      };
    }

    return {
      success: true,
      data: result,
    };
  }
}
