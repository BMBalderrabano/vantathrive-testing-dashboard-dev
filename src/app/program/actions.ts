'use server';

import { ProgramTemplatesQuery } from '@/lib/supabase/queries/program-templates';
import { ProgramAssignmentsQuery } from '@/lib/supabase/queries/program-assignments';
import { ExercisesQuery } from '@/lib/supabase/queries/exercises';
import { ExerciseTemplatesQuery } from '@/lib/supabase/queries/exercise-templates';
import { GroupsQuery } from '@/lib/supabase/queries/groups';
import { WorkoutSchedulesQuery } from '@/lib/supabase/queries/workout-schedules';
import { OrganizationsQuery } from '@/lib/supabase/queries/organizations';
import { createParallelQueries } from '@/lib/supabase/query';
import { DatabaseSchedule } from './[id]/workout-schedule/utils';
import type { Group } from '@/lib/supabase/schemas/exercise-templates';
import type { Group as DbGroup } from '@/lib/supabase/queries/groups';
import type { SelectedItem } from '@/app/program/[id]/template-config/types';
import type { ExerciseTemplate } from '@/lib/supabase/schemas/exercise-templates';
import { PROGRAM_ASSIGNMENT_STATUS } from '@/lib/constants/program-assignment-status';

/**
 * Get paginated program assignments with status='template' (joined with program_template)
 * Supports server-side filtering for search and weeks
 */
export async function getProgramAssignmentsPaginated(
  page: number = 1,
  pageSize: number = 16,
  search?: string,
  weeks?: number,
  showAssigned: boolean = false,
  organizationId?: string | null,
) {
  const query = new ProgramAssignmentsQuery();
  return query.getTemplatesPaginated(
    page,
    pageSize,
    search,
    weeks,
    showAssigned,
    organizationId,
  );
}

export async function getOrganizations() {
  const query = new OrganizationsQuery();
  return query.getList();
}

export async function getOrganizationById(id: string) {
  const query = new OrganizationsQuery();
  return query.getById(id);
}

/**
 * Get a single program assignment by ID (joined with program_template)
 */
export async function getProgramAssignmentById(id: string) {
  const query = new ProgramAssignmentsQuery();
  return query.getById(id);
}

/**
 * Get the global pre-program template assignment for the pinned builder card.
 */
export async function getPreProgramTemplate() {
  const query = new ProgramAssignmentsQuery();
  return query.getPreProgramTemplate();
}

/**
 * Create a new program template and program assignment
 */
export async function createProgramTemplate(
  name: string,
  weeks: number,
  startDate?: string | null,
  description?: string | null,
  goals?: string | null,
  notes?: string | null,
  organizationId?: string | null,
) {
  const templateQuery = new ProgramTemplatesQuery();
  const assignmentQuery = new ProgramAssignmentsQuery();

  // Create program_template first
  const templateResult = await templateQuery.create(
    name,
    weeks,
    description,
    goals,
    notes,
    organizationId,
  );

  if (!templateResult.success) {
    return templateResult;
  }

  const templateId = templateResult.data.id;

  // Template assignments never have dates
  const assignmentResult = await assignmentQuery.create(
    templateId,
    null,
    null,
    organizationId,
  );

  if (!assignmentResult.success) {
    // If assignment creation fails, we could optionally rollback template creation
    // For now, we'll return the error
    return assignmentResult;
  }

  // Return both template and assignment data
  return {
    success: true as const,
    data: {
      template: templateResult.data,
      assignment: assignmentResult.data,
    },
  };
}

/**
 * Delete a program assignment and its associated template
 * Deletes the template, which cascades to delete the assignment
 */
export async function deleteProgramAssignment(assignmentId: string) {
  const assignmentQuery = new ProgramAssignmentsQuery();

  // Delete the assignment
  const deleteAssignmentResult = await assignmentQuery.delete(assignmentId);

  if (!deleteAssignmentResult.success) {
    return deleteAssignmentResult;
  }

  return {
    success: true as const,
    data: undefined,
  };
}

/**
 * Clone a program assignment into a new template (new program_template + program_assignment).
 * Returns the new assignment id for redirect.
 */
export async function cloneProgramAssignment(assignmentId: string) {
  const assignmentQuery = new ProgramAssignmentsQuery();

  const result = await assignmentQuery.cloneToTemplate(assignmentId);

  if (!result.success) {
    return result;
  }

  return {
    success: true as const,
    data: { assignmentId: result.data.assignment.id },
  };
}

/**
 * Update a program template
 */
export async function updateProgramTemplate(
  templateId: string,
  name: string,
  weeks: number,
  description?: string | null,
  goals?: string | null,
  notes?: string | null,
  startDate?: string | null,
  endDate?: string | null,
) {
  const templateQuery = new ProgramTemplatesQuery();

  // Update program_template
  const updateResult = await templateQuery.update(templateId, {
    name: name.trim(),
    weeks,
    description: description?.trim() || null,
    goals: goals?.trim() || null,
    notes: notes?.trim() || null,
  });

  if (!updateResult.success) {
    return updateResult;
  }

  const assignmentQuery = new ProgramAssignmentsQuery();
  if (startDate && endDate) {
    const updateDatesResult = await assignmentQuery.updateDatesByTemplateId(
      templateId,
      startDate,
      endDate,
    );

    if (!updateDatesResult.success) {
      return updateDatesResult;
    }
  } else {
    // Clear dates on template assignment when saving a template (no dates)
    const clearResult =
      await assignmentQuery.clearDatesByTemplateId(templateId);
    if (!clearResult.success) {
      return clearResult;
    }
  }

  return {
    success: true as const,
    data: updateResult.data,
  };
}

/**
 * Get paginated exercises with search and sort
 */
export async function getExercisesPaginated(
  page: number = 1,
  pageSize: number = 20,
  search?: string,
  sortBy: string = 'updated_at',
  sortOrder: 'asc' | 'desc' = 'desc',
  type?: string | null,
) {
  const query = new ExercisesQuery();
  return query.getListPaginated(
    page,
    pageSize,
    search,
    sortBy,
    sortOrder,
    type,
  );
}

/**
 * Get distinct exercise types (sources) for filter dropdown
 */
export async function getExerciseTypes() {
  const query = new ExercisesQuery();
  return query.getDistinctTypes();
}

/**
 * Get paginated exercise templates with search and sort
 */
export async function getExerciseTemplatesPaginated(
  page: number = 1,
  pageSize: number = 20,
  search?: string,
  sortBy: string = 'updated_at',
  sortOrder: 'asc' | 'desc' = 'desc',
) {
  const query = new ExerciseTemplatesQuery();
  return query.getListPaginated(page, pageSize, search, sortBy, sortOrder);
}

/**
 * Get paginated groups with search and sort
 */
export async function getGroupsPaginated(
  page: number = 1,
  pageSize: number = 20,
  search?: string,
  sortBy: string = 'updated_at',
  sortOrder: 'asc' | 'desc' = 'desc',
) {
  const query = new GroupsQuery();
  return query.getListPaginated(page, pageSize, search, sortBy, sortOrder);
}

/**
 * Get multiple exercise templates by IDs
 */
export async function getExerciseTemplatesByIds(ids: string[]) {
  const query = new ExerciseTemplatesQuery();
  const result = await query.getByIds(ids);

  if (!result.success) {
    return result;
  }

  return {
    success: true as const,
    data: Array.from(result.data.values()),
  };
}

/**
 * Upsert exercise template via RPC function
 */
export async function upsertExerciseTemplate(data: {
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
}): Promise<
  | { success: true; data: { id: string; template_hash: string } }
  | { success: false; error: string }
> {
  const query = new ExerciseTemplatesQuery();
  const result = await query.upsertExerciseTemplate(data);

  if (!result.success) {
    return result;
  }

  const rpcResult = result.data as {
    id: string;
    template_hash: string;
    cloned?: boolean;
    reference_count?: number;
    original_id?: string;
  };

  return {
    success: true,
    data: {
      id: rpcResult.id,
      template_hash: rpcResult.template_hash,
    },
  };
}

/**
 * Edit existing exercise template via RPC (updates the row by id)
 */
export async function editExerciseTemplate(data: {
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
}): Promise<
  | { success: true; data: { id: string; template_hash: string } }
  | { success: false; error: string }
> {
  const query = new ExerciseTemplatesQuery();
  const result = await query.editExerciseTemplate(data);

  if (!result.success) {
    return result;
  }

  const rpcResult = result.data as {
    id?: string;
    template_hash?: string;
  };

  return {
    success: true,
    data: {
      id: rpcResult.id ?? data.p_template_id,
      template_hash: rpcResult.template_hash ?? '',
    },
  };
}

/**
 * Upsert group via RPC function
 * Returns either success with group data or error
 */
export async function upsertGroup(data: {
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
  const query = new GroupsQuery();
  return query.upsertGroup(data);
}

/**
 * Upsert workout schedule via RPC function
 */
export async function upsertWorkoutSchedule(
  schedule: DatabaseSchedule,
  notes?: string,
) {
  const query = new WorkoutSchedulesQuery();
  return query.upsertWorkoutSchedule(schedule, notes);
}

/**
 * Get workout schedule data for a program assignment
 * Fetches program_assignment with patient_override and workout_schedules.schedule
 */
export async function getWorkoutScheduleData(programAssignmentId: string) {
  const query = new WorkoutSchedulesQuery();
  const result = await query.getScheduleDataByAssignmentId(programAssignmentId);

  if (!result.success) {
    return result;
  }

  return {
    success: true as const,
    data: {
      schedule: result.data.schedule,
      patientOverride: result.data.patientOverride,
    },
  };
}

/**
 * Update program assignment workout schedule ID
 */
export async function updateProgramSchedule(
  assignmentId: string,
  workoutScheduleId: string,
) {
  const query = new ProgramAssignmentsQuery();
  return query.updateWorkoutScheduleId(assignmentId, workoutScheduleId);
}

/**
 * Convert database schedule format to SelectedItem[][][] format
 * Server action version that uses server-side query classes
 */
export async function convertScheduleToSelectedItems(
  schedule: unknown,
): Promise<
  { success: true; data: unknown } | { success: false; error: string }
> {
  type DatabaseScheduleDay = {
    exercises: Array<{ id: string; type: 'exercise_template' | 'group' }>;
  };
  type DatabaseSchedule = DatabaseScheduleDay[][];

  const dbSchedule = schedule as DatabaseSchedule | null;

  if (!dbSchedule || dbSchedule.length === 0) {
    return {
      success: true as const,
      data: [],
    };
  }

  // Extract all IDs from schedule
  const exerciseTemplateIds = new Set<string>();
  const groupIds = new Set<string>();

  for (const week of dbSchedule) {
    for (const day of week) {
      for (const exercise of day.exercises) {
        if (exercise.type === 'exercise_template') {
          exerciseTemplateIds.add(exercise.id);
        } else if (exercise.type === 'group') {
          groupIds.add(exercise.id);
        }
      }
    }
  }

  // Fetch all exercise templates and groups in parallel
  const templatesQuery = new ExerciseTemplatesQuery();
  const groupsQuery = new GroupsQuery();

  const data = await createParallelQueries({
    groups: {
      // keep this query always present so dependent queries can rely on it
      query: () => groupsQuery.getByIds(Array.from(groupIds)),
      defaultValue: new Map<string, DbGroup>(),
    },
    templates: {
      query: (deps: { groups: Map<string, DbGroup> }) => {
        const allTemplateIds = new Set<string>(exerciseTemplateIds);
        for (const group of deps.groups.values()) {
          for (const id of group.exercise_template_ids ?? []) {
            allTemplateIds.add(id);
          }
        }
        return templatesQuery.getByIds(Array.from(allTemplateIds));
      },
      dependsOn: ['groups'] as const,
      defaultValue: new Map<string, ExerciseTemplate>(),
    },
  });

  const groupsMap = data.groups ?? new Map();
  const templatesMap = data.templates ?? new Map();

  // Convert schedule to SelectedItem format
  const convertedSchedule: SelectedItem[][][] = [];

  for (const week of dbSchedule) {
    const convertedWeek: SelectedItem[][] = [];

    for (const day of week) {
      const convertedDay: SelectedItem[] = [];

      for (const exercise of day.exercises) {
        if (exercise.type === 'exercise_template') {
          const template = templatesMap.get(exercise.id);
          if (template) {
            convertedDay.push({
              type: 'template',
              data: template as ExerciseTemplate,
            });
          }
        } else if (exercise.type === 'group') {
          const group = groupsMap.get(exercise.id);
          if (group) {
            // Fetch exercise templates for this group
            const groupTemplates: Array<
              Extract<SelectedItem, { type: 'template' }>
            > = [];
            if (
              group.exercise_template_ids &&
              group.exercise_template_ids.length > 0
            ) {
              for (const templateId of group.exercise_template_ids) {
                const template = templatesMap.get(templateId);
                if (template) {
                  groupTemplates.push({
                    type: 'template',
                    data: template as ExerciseTemplate,
                  });
                }
              }
            }

            const groupData: Group = {
              id: group.id,
              name: group.title,
              isSuperset: group.is_superset || false,
              items: groupTemplates,
            };
            const selectedItem: SelectedItem = {
              type: 'group',
              data: groupData,
            };
            convertedDay.push(selectedItem);
          }
        }
      }

      convertedWeek.push(convertedDay);
    }

    convertedSchedule.push(convertedWeek);
  }

  return {
    success: true as const,
    data: convertedSchedule,
  };
}

/**
 * Update workout schedule for derived active assignments
 * @param baseAssignmentId - The base template assignment ID
 * @param workoutScheduleId - The new workout schedule ID
 * @returns Success with count of updated assignments or error
 */
export async function updateDerivedProgramSchedules(
  baseAssignmentId: string,
  workoutScheduleId: string,
) {
  const query = new ProgramAssignmentsQuery();
  return query.updateDerivedAssignmentsSchedule(
    baseAssignmentId,
    workoutScheduleId,
    PROGRAM_ASSIGNMENT_STATUS.ACTIVE,
  );
}

/**
 * Update workout schedule for derived pre-program user assignments.
 */
export async function updateDerivedPreProgramSchedules(
  baseAssignmentId: string,
  workoutScheduleId: string,
) {
  const query = new ProgramAssignmentsQuery();
  return query.updateDerivedAssignmentsSchedule(
    baseAssignmentId,
    workoutScheduleId,
    PROGRAM_ASSIGNMENT_STATUS.PRE_PROGRAM,
  );
}
