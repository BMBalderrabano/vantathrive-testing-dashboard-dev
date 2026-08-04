import {
  SupabaseQuery,
  type SupabaseSuccess,
  type SupabaseError,
} from '../query';
import {
  programAssignmentSchema,
  programAssignmentWithTemplateSchema,
  type ProgramAssignment,
  type ProgramAssignmentWithTemplate,
} from '../schemas/program-assignments';
import type { ProgramTemplate } from '../schemas/program-templates';
import { GroupsQuery } from './groups';
import { ExerciseTemplatesQuery } from './exercise-templates';
import { ProgramTemplatesQuery } from './program-templates';
import { Database } from '../database.types';
import { calculateEndDate, formatDateForDB } from '@/lib/utils';
import { PROGRAM_ASSIGNMENT_STATUS } from '@/lib/constants/program-assignment-status';

export const MIN_GATES_FOR_PROGRAM_ASSIGNMENT = 5;

export class ProgramAssignmentsQuery extends SupabaseQuery {
  /**
   * Get all program assignments with status='template' (joined with program_template)
   * @returns Success with program assignments array or error
   */
  public async getTemplates(): Promise<
    SupabaseSuccess<ProgramAssignmentWithTemplate[]> | SupabaseError
  > {
    const supabase = await this.getClient('service_role');

    const { data, error } = await supabase
      .from('program_assignment')
      .select(
        `
        *,
        program_template (*),
        workout_schedule:workout_schedules (*)
      `,
      )
      .eq('status', 'template')
      .order('created_at', { ascending: false });

    if (error) {
      return this.parseResponsePostgresError(
        error,
        'Failed to get program assignments',
      );
    }

    if (!data) {
      return {
        success: true,
        data: [],
      };
    }

    // Transform the data to match our schema structure
    const transformedData = data.map((item: ProgramAssignmentWithTemplate) => ({
      ...item,
      program_template: item.program_template || null,
      workout_schedule:
        (item as { workout_schedule?: unknown }).workout_schedule || null,
    }));

    const result = programAssignmentWithTemplateSchema
      .array()
      .safeParse(transformedData);

    if (!result.success) {
      return this.parseResponseZodError(result.error);
    }

    return {
      success: true,
      data: result.data,
    };
  }

  /**
   * Create an empty paginated result
   * @param page - Page number
   * @param pageSize - Page size
   * @returns Empty paginated result structure
   */
  private createEmptyPaginatedResult(
    page: number,
    pageSize: number,
  ): SupabaseSuccess<{
    data: ProgramAssignmentWithTemplate[];
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  }> {
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

  /**
   * Filter template IDs by weeks
   * @param weeks - Number of weeks to filter by
   * @returns Template IDs matching the weeks filter, or error
   */
  private async filterByWeeks(
    weeks: number,
  ): Promise<SupabaseSuccess<string[]> | SupabaseError> {
    const supabase = await this.getClient('service_role');
    const { data: templates, error: templatesError } = await supabase
      .from('program_template')
      .select('id')
      .eq('weeks', weeks);

    if (templatesError) {
      return this.parseResponsePostgresError(
        templatesError,
        'Failed to filter by weeks',
      );
    }

    const templateIds = templates?.map((t) => t.id) || [];
    return {
      success: true,
      data: templateIds,
    };
  }

  /**
   * Filter template IDs by search query
   * @param search - Search query string
   * @param existingTemplateIds - Optional existing template IDs to intersect with
   * @returns Template IDs matching the search, or error
   */
  private async filterBySearch(
    search: string,
    existingTemplateIds?: string[],
  ): Promise<SupabaseSuccess<string[]> | SupabaseError> {
    const supabase = await this.getClient('service_role');
    const searchLower = search.toLowerCase();
    const { data: searchTemplates, error: searchError } = await supabase
      .from('program_template')
      .select('id')
      .or(
        `name.ilike.%${searchLower}%,description.ilike.%${searchLower}%,goals.ilike.%${searchLower}%`,
      );

    if (searchError) {
      return this.parseResponsePostgresError(
        searchError,
        'Failed to search templates',
      );
    }

    const searchTemplateIds = searchTemplates?.map((t) => t.id) || [];

    // Intersect with existing template IDs if provided
    const templateIds = existingTemplateIds
      ? existingTemplateIds.filter((id) => searchTemplateIds.includes(id))
      : searchTemplateIds;

    return {
      success: true,
      data: templateIds,
    };
  }

  /**
   * Get paginated program assignments (joined with program_template)
   * Supports server-side filtering for search and weeks
   * @param page - Page number (1-indexed)
   * @param pageSize - Number of items per page
   * @param search - Optional search query (searches program_template.name, description, goals)
   * @param weeks - Optional weeks filter (filters by program_template.weeks)
   * @param showAssigned - If true, show both 'template' and 'active'. If false, only 'template'
   * @returns Success with paginated data or error
   */
  public async getTemplatesPaginated(
    page: number = 1,
    pageSize: number = 16,
    search?: string,
    weeks?: number,
    showAssigned: boolean = false,
    organizationId?: string | null,
  ): Promise<
    | SupabaseSuccess<{
        data: ProgramAssignmentWithTemplate[];
        page: number;
        pageSize: number;
        total: number;
        hasMore: boolean;
      }>
    | SupabaseError
  > {
    const supabase = await this.getClient('service_role');

    // Filter by weeks if provided
    let templateIds: string[] | undefined;
    if (weeks !== undefined && weeks !== null) {
      const weeksResult = await this.filterByWeeks(weeks);
      if (!weeksResult.success) {
        return weeksResult;
      }

      templateIds = weeksResult.data;
      if (templateIds.length === 0) {
        return this.createEmptyPaginatedResult(page, pageSize);
      }
    }

    // Filter by search if provided
    if (search) {
      const searchResult = await this.filterBySearch(search, templateIds);
      if (!searchResult.success) {
        return searchResult;
      }

      templateIds = searchResult.data;
      if (templateIds.length === 0) {
        return this.createEmptyPaginatedResult(page, pageSize);
      }
    }

    // Build main query
    // Always include profiles in select to avoid type issues, but only use it when showAssigned is true
    let query = supabase.from('program_assignment').select(
      `
        *,
        program_template (*),
        workout_schedule:workout_schedules (*),
        profiles!program_assignment_user_id_fkey (id, first_name, last_name, email)
      `,
      { count: 'exact' },
    );

    // Filter by status
    if (showAssigned) {
      query = query.in('status', ['template', 'active']);
    } else {
      query = query.eq('status', 'template');
    }

    // Apply template ID filter if we have one
    if (templateIds && templateIds.length > 0) {
      query = query.in('program_template_id', templateIds);
    }

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    // Apply sorting
    query = query.order('created_at', { ascending: false });

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return this.parseResponsePostgresError(
        error,
        'Failed to get program assignments',
      );
    }

    if (!data) {
      return this.createEmptyPaginatedResult(page, pageSize);
    }

    // Transform the data to match our schema structure
    const transformedData = data.map(
      (
        item,
      ) => ({
        ...(item as ProgramAssignmentWithTemplate),
        program_template: item.program_template || null,
        workout_schedule:
          (
            item as {
              workout_schedule?: Database['public']['Tables']['workout_schedules']['Row'];
            }
          ).workout_schedule || null,
        profiles: showAssigned
          ? (
              item as {
                profiles?: {
                  id: string;
                  first_name?: string;
                  last_name?: string;
                  email: string;
                };
              }
            ).profiles || null
          : undefined,
      }),
    );

    const result = programAssignmentWithTemplateSchema
      .array()
      .safeParse(transformedData);

    if (!result.success) {
      return this.parseResponseZodError(result.error);
    }

    // For accurate count when filtering, we need to count the filtered results
    const total = templateIds
      ? result.data.length < pageSize
        ? from + result.data.length
        : count || 0
      : count || 0;
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
   * Get a single program assignment by ID (joined with program_template)
   * @param id - The assignment ID
   * @returns Success with program assignment or error
   */
  public async getById(
    id: string,
  ): Promise<SupabaseSuccess<ProgramAssignmentWithTemplate> | SupabaseError> {
    const supabase = await this.getClient('service_role');

    const { data, error } = await supabase
      .from('program_assignment')
      .select(
        `
        *,
        program_template (*),
        workout_schedule:workout_schedules (*),
        profiles!program_assignment_user_id_fkey (id, first_name, last_name, email)
      `,
      )
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(error);
      return this.parseResponsePostgresError(
        error,
        'Failed to get program assignment',
      );
    }

    if (!data) {
      console.error('Program assignment not found');
      return {
        success: false,
        error: 'Program assignment not found',
      };
    }

    const result = programAssignmentWithTemplateSchema.safeParse(data);

    if (!result.success) {
      return this.parseResponseZodError(result.error);
    }

    return {
      success: true,
      data: result.data,
    };
  }

  /**
   * Create a new program assignment with status='template'
   * @param programTemplateId - The program template ID
   * @param startDate - Start date (ISO string)
   * @param endDate - End date (ISO string)
   * @param organizationId - Optional organization ID
   * @param workoutScheduleId - Optional workout schedule ID to link
   * @returns Success with created assignment or error
   */
  public async create(
    programTemplateId: string,
    startDate: string | null,
    endDate: string | null,
    organizationId?: string | null,
    workoutScheduleId?: string | null,
  ): Promise<SupabaseSuccess<ProgramAssignment> | SupabaseError> {
    const supabase = await this.getClient('service_role');

    const { data, error } = await supabase
      .from('program_assignment')
      .insert({
        program_template_id: programTemplateId,
        start_date: startDate ?? null,
        end_date: endDate ?? null,
        status: 'template',
        user_id: null,
        organization_id: organizationId || null,
        workout_schedule_id: workoutScheduleId ?? null,
      })
      .select()
      .single();

    if (error) {
      return this.parseResponsePostgresError(
        error,
        'Failed to create program assignment',
      );
    }

    if (!data) {
      return {
        success: false,
        error: 'Failed to create program assignment',
      };
    }

    const result = programAssignmentSchema.safeParse(data);

    if (!result.success) {
      return this.parseResponseZodError(result.error);
    }

    return {
      success: true,
      data: result.data,
    };
  }

  /**
   * Get the global pre-program template assignment (singleton).
   * @returns Success with assignment or null if not seeded
   */
  public async getPreProgramTemplate(): Promise<
    SupabaseSuccess<ProgramAssignmentWithTemplate | null> | SupabaseError
  > {
    const supabase = await this.getClient('service_role');

    const { data, error } = await supabase
      .from('program_assignment')
      .select(
        `
        *,
        program_template (*),
        workout_schedule:workout_schedules (*)
      `,
      )
      .eq('status', PROGRAM_ASSIGNMENT_STATUS.PRE_PROGRAM_TEMPLATE)
      .limit(1)
      .maybeSingle();

    if (error) {
      return this.parseResponsePostgresError(
        error,
        'Failed to get pre-program template',
      );
    }

    if (!data) {
      return {
        success: true,
        data: null,
      };
    }

    const transformedData = {
      ...data,
      program_template: data.program_template || null,
      workout_schedule:
        (data as { workout_schedule?: unknown }).workout_schedule || null,
    };

    const result = programAssignmentWithTemplateSchema.safeParse(transformedData);

    if (!result.success) {
      return this.parseResponseZodError(result.error);
    }

    return {
      success: true,
      data: result.data,
    };
  }

  /**
   * Clone a program assignment into a new template (new program_template + new program_assignment).
   * Copies all template fields with name + " (clone)", same workout_schedule_id; no user/completion.
   * @param assignmentId - The source program assignment ID
   * @returns Success with { template, assignment } or error
   */
  public async cloneToTemplate(assignmentId: string): Promise<
    | SupabaseSuccess<{
        template: ProgramTemplate;
        assignment: ProgramAssignment;
      }>
    | SupabaseError
  > {
    const sourceResult = await this.getById(assignmentId);
    if (!sourceResult.success) return sourceResult;

    const source = sourceResult.data;
    if (!source.program_template) {
      return {
        success: false,
        error: 'Program template not found',
      };
    }

    if (source.status === PROGRAM_ASSIGNMENT_STATUS.PRE_PROGRAM_TEMPLATE) {
      return {
        success: false,
        error: 'Cannot clone the Pre-Program template',
      };
    }

    const template = source.program_template;
    const templateQuery = new ProgramTemplatesQuery();

    const templateResult = await templateQuery.create(
      `${template.name} (clone)`,
      template.weeks,
      template.description ?? null,
      template.goals ?? null,
      template.notes ?? null,
      source.organization_id ?? template.organization_id ?? null,
      template.image_url != null ? String(template.image_url) : null,
    );

    if (!templateResult.success) return templateResult;

    const assignmentResult = await this.create(
      templateResult.data.id,
      null,
      null,
      source.organization_id ?? null,
      source.workout_schedule_id ?? null,
    );

    if (!assignmentResult.success) return assignmentResult;

    return {
      success: true,
      data: {
        template: templateResult.data,
        assignment: assignmentResult.data,
      },
    };
  }

  /**
   * Get program assignment by program template ID
   * @param programTemplateId - The program template ID
   * @returns Success with program assignment or error
   */
  public async getByTemplateId(
    programTemplateId: string,
  ): Promise<SupabaseSuccess<ProgramAssignment | null> | SupabaseError> {
    const supabase = await this.getClient('service_role');

    const { data, error } = await supabase
      .from('program_assignment')
      .select('*')
      .eq('program_template_id', programTemplateId)
      .eq('status', 'template')
      .limit(1)
      .maybeSingle();

    if (error) {
      return this.parseResponsePostgresError(
        error,
        'Failed to get program assignment',
      );
    }

    if (!data) {
      return {
        success: true,
        data: null,
      };
    }

    const result = programAssignmentSchema.safeParse(data);

    if (!result.success) {
      return this.parseResponseZodError(result.error);
    }

    return {
      success: true,
      data: result.data,
    };
  }

  /**
   * Delete a program assignment
   * @param id - The assignment ID
   * @returns Success or error
   */
  public async delete(
    id: string,
  ): Promise<SupabaseSuccess<void> | SupabaseError> {
    const supabase = await this.getClient('service_role');

    const { data: existing, error: fetchError } = await supabase
      .from('program_assignment')
      .select('status')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      return this.parseResponsePostgresError(
        fetchError,
        'Failed to delete program assignment',
      );
    }

    if (existing?.status === PROGRAM_ASSIGNMENT_STATUS.PRE_PROGRAM_TEMPLATE) {
      return {
        success: false,
        error: 'Cannot delete the Pre-Program template',
      };
    }

    const { error } = await supabase
      .from('program_assignment')
      .delete()
      .eq('id', id);

    if (error) {
      return this.parseResponsePostgresError(
        error,
        'Failed to delete program assignment',
      );
    }

    return {
      success: true,
      data: undefined,
    };
  }

  /**
   * Update dates for all program assignments with status='template' for a given template ID
   * @param templateId - The program template ID
   * @param startDate - Start date (ISO string)
   * @param endDate - End date (ISO string)
   * @returns Success or error
   */
  public async updateDatesByTemplateId(
    templateId: string,
    startDate: string,
    endDate: string,
  ): Promise<SupabaseSuccess<void> | SupabaseError> {
    const supabase = await this.getClient('service_role');

    // Get assignments with status='template' for this template
    const { data: assignments, error: fetchError } = await supabase
      .from('program_assignment')
      .select('id')
      .eq('program_template_id', templateId)
      .eq('status', 'template');

    if (fetchError) {
      return this.parseResponsePostgresError(
        fetchError,
        'Failed to fetch program assignments',
      );
    }

    if (!assignments || assignments.length === 0) {
      return {
        success: true,
        data: undefined,
      };
    }

    // Update each assignment's dates
    for (const assignment of assignments) {
      const { error } = await supabase
        .from('program_assignment')
        .update({
          start_date: startDate,
          end_date: endDate,
        })
        .eq('id', assignment.id);

      if (error) {
        return this.parseResponsePostgresError(
          error,
          'Failed to update program assignment dates',
        );
      }
    }

    return {
      success: true,
      data: undefined,
    };
  }

  /**
   * Clear start_date and end_date for template assignments with this program_template_id.
   */
  public async clearDatesByTemplateId(
    templateId: string,
  ): Promise<SupabaseSuccess<void> | SupabaseError> {
    const supabase = await this.getClient('service_role');

    const { data: assignments, error: fetchError } = await supabase
      .from('program_assignment')
      .select('id')
      .eq('program_template_id', templateId)
      .eq('status', 'template');

    if (fetchError) {
      return this.parseResponsePostgresError(
        fetchError,
        'Failed to fetch program assignments',
      );
    }

    if (!assignments || assignments.length === 0) {
      return { success: true, data: undefined };
    }

    for (const assignment of assignments) {
      const { error } = await supabase
        .from('program_assignment')
        .update({ start_date: null, end_date: null })
        .eq('id', assignment.id);

      if (error) {
        return this.parseResponsePostgresError(
          error,
          'Failed to clear program assignment dates',
        );
      }
    }

    return { success: true, data: undefined };
  }

  /**
   * Update workout schedule ID
   * @param assignmentId - The assignment ID
   * @param workoutScheduleId - The workout schedule ID
   * @returns Success or error
   */
  public async updateWorkoutScheduleId(
    assignmentId: string,
    workoutScheduleId: string,
  ): Promise<SupabaseSuccess<void> | SupabaseError> {
    const supabase = await this.getClient('service_role');

    const { error } = await supabase
      .from('program_assignment')
      .update({ workout_schedule_id: workoutScheduleId })
      .eq('id', assignmentId);

    if (error) {
      return this.parseResponsePostgresError(
        error,
        'Failed to update program assignment',
      );
    }

    return {
      success: true,
      data: undefined,
    };
  }

  /**
   * Get workout schedule fields (workout_schedule_id and patient_override) for a program assignment
   * @param assignmentId - The assignment ID
   * @returns Success with workout schedule fields or error
   */
  public async getWorkoutScheduleFields(assignmentId: string): Promise<
    | SupabaseSuccess<{
        workout_schedule_id: string | null;
        patient_override: unknown;
      }>
    | SupabaseError
  > {
    const supabase = await this.getClient('service_role');

    const { data: assignment, error } = await supabase
      .from('program_assignment')
      .select('workout_schedule_id, patient_override')
      .eq('id', assignmentId)
      .maybeSingle();

    if (error) {
      return this.parseResponsePostgresError(
        error,
        'Failed to fetch program assignment',
      );
    }

    if (!assignment) {
      return {
        success: false,
        error: 'Program assignment not found',
      };
    }

    return {
      success: true,
      data: {
        workout_schedule_id: assignment.workout_schedule_id,
        patient_override: assignment.patient_override as unknown,
      },
    };
  }

  /**
   * Get compliance (or program_completion_percentage) from program_with_stats for a user.
   * @param userId - The user ID
   * @returns Success with compliance percentage (number | null) or error
   */
  public async getComplianceByUserId(
    userId: string,
  ): Promise<SupabaseSuccess<number | null> | SupabaseError> {
    const supabase = await this.getClient('service_role');

    const { data, error } = await supabase
      .from('program_with_stats')
      .select('compliance, program_completion_percentage')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      return this.parseResponsePostgresError(
        error,
        'Failed to fetch compliance',
      );
    }

    if (!data) {
      return { success: true, data: null };
    }

    const row = data as {
      compliance?: number | null;
      program_completion_percentage?: number | null;
    };
    const value = row.compliance ?? row.program_completion_percentage ?? null;
    return { success: true, data: value };
  }

  /**
   * Get active program assignment by user ID (joined with program_template and workout_schedule)
   * @param userId - The user ID
   * @returns Success with program assignment, exercise names map, and groups map, or null if not found, or error
   */
  public async getActiveByUserId(userId: string): Promise<
    | SupabaseSuccess<{
        assignment: ProgramAssignmentWithTemplate | null;
        exerciseNamesMap: Map<string, string>;
        groupsMap: Map<string, { exercise_template_ids: string[] | null }>;
      }>
    | SupabaseError
  > {
    const supabase = await this.getClient('service_role');

    const { data, error } = await supabase
      .from('program_assignment')
      .select(
        `
        *,
        program_template (*),
        workout_schedule:workout_schedules (*)
      `,
      )
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      // Handle the specific case where maybeSingle fails due to join issues
      if (
        error.code === 'PGRST116' ||
        error.message?.includes(
          'Cannot coerce the result to a single JSON object',
        )
      ) {
        return {
          success: true,
          data: {
            assignment: null,
            exerciseNamesMap: new Map(),
            groupsMap: new Map(),
          },
        };
      }
      return this.parseResponsePostgresError(
        error,
        'Failed to get program assignment',
      );
    }

    if (!data) {
      return {
        success: true,
        data: {
          assignment: null,
          exerciseNamesMap: new Map(),
          groupsMap: new Map(),
        },
      };
    }

    // Transform the data to match our schema structure
    const transformedData = {
      ...data,
      program_template: data.program_template || null,
      workout_schedule:
        (data as { workout_schedule?: unknown }).workout_schedule || null,
    };

    const result =
      programAssignmentWithTemplateSchema.safeParse(transformedData);

    if (!result.success) {
      return this.parseResponseZodError(result.error);
    }

    const assignment = result.data;

    // Extract exercise_template_ids and group_ids from workout_schedule
    const workoutSchedule = assignment.workout_schedule;
    const exerciseTemplateIds =
      (workoutSchedule?.exercise_template_ids as string[] | null) || [];
    const groupIds = (workoutSchedule?.group_ids as string[] | null) || [];

    // Fetch groups to extract their exercise_template_ids
    const groupsQuery = new GroupsQuery();
    const groupsResult = await groupsQuery.getByIds(groupIds);

    // Extract exercise template IDs from groups
    const exerciseTemplateIdsFromGroups: string[] = [];
    const groupsMap = new Map<
      string,
      { exercise_template_ids: string[] | null }
    >();

    if (groupsResult.success) {
      for (const [groupId, group] of groupsResult.data) {
        groupsMap.set(groupId, {
          exercise_template_ids: group.exercise_template_ids,
        });
        if (group.exercise_template_ids) {
          exerciseTemplateIdsFromGroups.push(...group.exercise_template_ids);
        }
      }
    }

    // Combine all exercise template IDs and get distinct set
    const allExerciseTemplateIds = [
      ...new Set([...exerciseTemplateIds, ...exerciseTemplateIdsFromGroups]),
    ];

    // Fetch exercise templates
    const exerciseTemplatesQuery = new ExerciseTemplatesQuery();
    const exerciseTemplatesResultFinal = await exerciseTemplatesQuery.getByIds(
      allExerciseTemplateIds,
    );

    // Create exercise names map
    const exerciseNamesMap = new Map<string, string>();
    if (exerciseTemplatesResultFinal.success) {
      for (const [templateId, template] of exerciseTemplatesResultFinal.data) {
        if (template.exercise_name) {
          exerciseNamesMap.set(templateId, template.exercise_name);
        }
      }
    }

    return {
      success: true,
      data: {
        assignment,
        exerciseNamesMap,
        groupsMap,
      },
    };
  }

  /**
   * Get paginated program assignments with search and status filtering
   * @param page - Page number (1-indexed)
   * @param pageSize - Number of items per page
   * @param search - Optional search query (searches user_id, first_name, last_name, email, program_template.name)
   * @param showAssigned - If true, show both 'template' and 'active' status. If false, only 'template'
   * @returns Success with paginated data or error
   */
  public async getListPaginated(
    page: number = 1,
    pageSize: number = 25,
    search?: string,
    showAssigned: boolean = false,
  ): Promise<
    | SupabaseSuccess<{
        data: ProgramAssignmentWithTemplate[];
        page: number;
        pageSize: number;
        total: number;
        hasMore: boolean;
      }>
    | SupabaseError
  > {
    const supabase = await this.getClient('service_role');

    let query = supabase.from('program_assignment').select(
      `
        *,
        program_template (*),
        workout_schedule:workout_schedules (*),
        profiles!program_assignment_user_id_fkey (id, first_name, last_name, email)
      `,
      { count: 'exact' },
    );

    // Filter by status
    if (showAssigned) {
      query = query.in('status', ['template', 'active']);
    } else {
      query = query.eq('status', 'template');
    }

    // Apply sorting
    query = query.order('created_at', { ascending: false });

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return this.parseResponsePostgresError(
        error,
        'Failed to get program assignments',
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

    // Transform the data to match our schema structure
    let transformedData = data.map((item: ProgramAssignmentWithTemplate) => ({
      ...item,
      program_template: item.program_template || null,
      workout_schedule:
        (item as { workout_schedule?: unknown }).workout_schedule || null,
      profiles: (item as { profiles?: unknown }).profiles || null,
    }));

    // Apply search filter in application layer (searches across multiple fields)
    if (search) {
      const searchLower = search.toLowerCase();
      transformedData = transformedData.filter((item) => {
        // Search in user_id
        if (item.user_id?.toLowerCase().includes(searchLower)) {
          return true;
        }

        // Search in profiles fields
        const profiles = item.profiles as
          | {
              first_name?: string | null;
              last_name?: string | null;
              email?: string | null;
            }
          | null
          | undefined;
        if (profiles) {
          const firstName = profiles.first_name?.toLowerCase() || '';
          const lastName = profiles.last_name?.toLowerCase() || '';
          const fullName = `${firstName} ${lastName}`.trim();
          const email = profiles.email?.toLowerCase() || '';
          if (
            firstName.includes(searchLower) ||
            lastName.includes(searchLower) ||
            fullName.includes(searchLower) ||
            email.includes(searchLower)
          ) {
            return true;
          }
        }

        // Search in program_template name
        if (item.program_template?.name?.toLowerCase().includes(searchLower)) {
          return true;
        }

        return false;
      });
    }

    const result = programAssignmentWithTemplateSchema
      .array()
      .safeParse(transformedData);

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
   * Assign a program template to a user by creating a new assignment
   * @param templateAssignmentId - The template assignment ID to copy from
   * @param userId - The user ID to assign to
   * @returns Success with created assignment or error
   */
  public async assignToUser(
    templateAssignmentId: string,
    userId: string,
    startDate: string, // ISO date string (YYYY-MM-DD)
  ): Promise<SupabaseSuccess<ProgramAssignment> | SupabaseError> {
    const supabase = await this.getClient('service_role');

    // First, get the template assignment to copy from
    const templateResult = await this.getById(templateAssignmentId);

    if (!templateResult.success) {
      return templateResult;
    }

    const templateAssignment = templateResult.data;

    // Get user's organization where role='patient'
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('role', 'patient')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (orgError) {
      return this.parseResponsePostgresError(
        orgError,
        'Failed to get user organization',
      );
    }

    if (!orgMember || !orgMember.organization_id) {
      return {
        success: false,
        error: 'User does not belong to any organization with patient role',
      };
    }

    const userOrganizationId = orgMember.organization_id;

    const { data: profileStats, error: statsError } = await supabase
      .from('profiles_with_stats')
      .select('max_gate_unlocked')
      .eq('id', userId)
      .maybeSingle();

    if (statsError) {
      return this.parseResponsePostgresError(
        statsError,
        'Failed to get user gate progress',
      );
    }

    const maxGate = profileStats?.max_gate_unlocked ?? null;
    if (maxGate === null || maxGate < MIN_GATES_FOR_PROGRAM_ASSIGNMENT) {
      return {
        success: false,
        error:
          'User must complete all 5 gates before a program can be assigned.',
      };
    }

    // Check if user already has an active assignment for this template
    const { data: existingAssignment } = await supabase
      .from('program_assignment')
      .select('id')
      .eq('user_id', userId)
      .eq('program_template_id', templateAssignment.program_template_id)
      .eq('status', 'active')
      .maybeSingle();

    if (existingAssignment) {
      return {
        success: false,
        error: 'User already has an active assignment for this program',
      };
    }

    // Calculate end date (inclusive): N weeks = Mon–Sun, end = start + (weeks * 7) - 1
    const templateWeeks = templateAssignment.program_template?.weeks || 0;
    const startDateObj = new Date(startDate);
    const calculatedEnd =
      templateWeeks >= 1
        ? calculateEndDate(startDateObj, templateWeeks)
        : undefined;
    const endDate = formatDateForDB(calculatedEnd ?? startDateObj);

    // Create new assignment from template
    const { data, error } = await supabase
      .from('program_assignment')
      .insert({
        program_template_id: templateAssignment.program_template_id,
        user_id: userId,
        organization_id: userOrganizationId,
        workout_schedule_id: templateAssignment.workout_schedule_id,
        start_date: startDate,
        end_date: endDate,
        status: 'active',
        completion: null,
        patient_override: null,
        base: templateAssignment.id,
      })
      .select()
      .single();

    if (error) {
      return this.parseResponsePostgresError(
        error,
        'Failed to assign program to user',
      );
    }

    if (!data) {
      return {
        success: false,
        error: 'Failed to create program assignment',
      };
    }

    const result = programAssignmentSchema.safeParse(data);

    if (!result.success) {
      return this.parseResponseZodError(result.error);
    }

    return {
      success: true,
      data: result.data,
    };
  }

  /**
   * Delete a program using the delete_program RPC function
   * @param programAssignmentId - The program assignment ID to delete
   * @returns Success or error
   */
  public async deleteProgramRPC(
    programAssignmentId: string,
  ): Promise<SupabaseSuccess<void> | SupabaseError> {
    if (!programAssignmentId) {
      return {
        success: false,
        error: 'Program assignment ID is required',
      };
    }

    const supabase = await this.getClient('service_role');
    const { error } = await supabase.rpc('delete_program', {
      p_program_assignment_id: programAssignmentId,
    });

    if (error) {
      return this.parseResponsePostgresError(error, 'Failed to delete program');
    }

    return {
      success: true,
      data: undefined,
    };
  }

  /**
   * Update workout_schedule_id for derived assignments from a template
   * @param baseAssignmentId - The base template assignment ID
   * @param workoutScheduleId - The new workout schedule ID
   * @param derivedStatus - Assignment status to update ('active' or 'pre_program')
   * @returns Success with count of updated records or error
   */
  public async updateDerivedAssignmentsSchedule(
    baseAssignmentId: string,
    workoutScheduleId: string,
    derivedStatus: typeof PROGRAM_ASSIGNMENT_STATUS.ACTIVE | typeof PROGRAM_ASSIGNMENT_STATUS.PRE_PROGRAM = PROGRAM_ASSIGNMENT_STATUS.ACTIVE,
  ): Promise<SupabaseSuccess<number> | SupabaseError> {
    if (!baseAssignmentId || !workoutScheduleId) {
      return {
        success: false,
        error: 'Base assignment ID and workout schedule ID are required',
      };
    }

    // Use service_role so we can update derived assignments belonging to other users
    const supabase = await this.getClient('service_role');

    // First, get the count of matching records
    const { count: matchCount, error: countError } = await supabase
      .from('program_assignment')
      .select('*', { count: 'exact', head: true })
      .eq('base', baseAssignmentId)
      .eq('status', derivedStatus);

    if (countError) {
      return this.parseResponsePostgresError(
        countError,
        'Failed to count derived assignments',
      );
    }

    // If there are no records to update, return early
    if (matchCount === 0) {
      return {
        success: true,
        data: 0,
      };
    }

    // Perform the update
    const { error } = await supabase
      .from('program_assignment')
      .update({ workout_schedule_id: workoutScheduleId })
      .eq('base', baseAssignmentId)
      .eq('status', derivedStatus);

    if (error) {
      return this.parseResponsePostgresError(
        error,
        'Failed to update derived assignments',
      );
    }

    return {
      success: true,
      data: matchCount ?? 0,
    };
  }
}
