import {
  SupabaseQuery,
  type SupabaseSuccess,
  type SupabaseError,
} from '../query';
import type { Json } from '../database.types';
import type { DatabaseSchedule } from '@/app/program/[id]/workout-schedule/utils';
import { formatScheduleDB } from '@/app/program/[id]/workout-schedule/utils';

export class WorkoutSchedulesQuery extends SupabaseQuery {
  /**
   * Upsert workout schedule via RPC function
   * @param schedule - The database schedule
   * @param notes - Optional notes
   * @returns Success with result or error
   */
  public async upsertWorkoutSchedule(
    schedule: DatabaseSchedule,
    notes?: string,
  ): Promise<
    SupabaseSuccess<{ id: string; schedule_hash: string }> | SupabaseError
  > {
    const supabase = await this.getClient('service_role');

    // Convert DatabaseSchedule to 3D array format expected by normalize_schedule_structure
    const schedule3D = formatScheduleDB(schedule);
    const scheduleJsonb = schedule3D as unknown;

    const { data: result, error } = await supabase.rpc(
      'upsert_workout_schedule',
      {
        p_schedule: scheduleJsonb as Json,
        p_notes: notes ?? undefined,
      },
    );

    if (error) {
      console.error('Error calling upsert_workout_schedule RPC:', error);
      return {
        success: false,
        error: error.message || 'Failed to upsert workout schedule',
      };
    }

    if (!result || (result as { success?: boolean }).success === false) {
      const errorResult = result as { error?: string; message?: string };
      const errorMessage =
        errorResult.message ||
        errorResult.error ||
        'Failed to upsert workout schedule';
      console.error(
        'Error from upsert_workout_schedule SQL function:',
        errorResult,
      );
      return {
        success: false,
        error: errorMessage,
      };
    }

    return {
      success: true,
      data: result as { id: string; schedule_hash: string },
    };
  }

  /**
   * Get workout schedule by ID
   * @param id - The workout schedule ID
   * @returns Success with schedule or error
   */
  public async getScheduleById(
    id: string,
  ): Promise<SupabaseSuccess<{ schedule: unknown } | null> | SupabaseError> {
    const supabase = await this.getClient('service_role');

    const { data: workoutSchedule, error } = await supabase
      .from('workout_schedules')
      .select('schedule')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return this.parseResponsePostgresError(
        error,
        'Failed to fetch workout schedule',
      );
    }

    if (!workoutSchedule) {
      return {
        success: true,
        data: null,
      };
    }

    return {
      success: true,
      data: {
        schedule: workoutSchedule.schedule as unknown,
      },
    };
  }

  /**
   * Get workout schedule data for a program assignment
   * Fetches program_assignment with patient_override and workout_schedules.schedule
   * @param programAssignmentId - The program assignment ID
   * @returns Success with schedule data or error
   */
  public async getScheduleDataByAssignmentId(
    programAssignmentId: string,
  ): Promise<
    | SupabaseSuccess<{
        schedule: unknown;
        patientOverride: unknown;
      }>
    | SupabaseError
  > {
    const supabase = await this.getClient('service_role');

    // Fetch program assignment with workout_schedule_id and patient_override
    const { data: assignment, error: assignmentError } = await supabase
      .from('program_assignment')
      .select('workout_schedule_id, patient_override')
      .eq('id', programAssignmentId)
      .maybeSingle();

    if (assignmentError) {
      return this.parseResponsePostgresError(
        assignmentError,
        'Failed to fetch program assignment',
      );
    }

    if (!assignment) {
      return {
        success: false,
        error: 'Program assignment not found',
      };
    }

    let schedule = null;

    // If workout_schedule_id exists, fetch the schedule
    if (assignment.workout_schedule_id) {
      const scheduleResult = await this.getScheduleById(
        assignment.workout_schedule_id,
      );

      if (!scheduleResult.success) {
        return scheduleResult;
      }

      schedule = scheduleResult.data?.schedule || null;
    }

    return {
      success: true,
      data: {
        schedule: schedule as unknown,
        patientOverride: assignment.patient_override as unknown,
      },
    };
  }
}
