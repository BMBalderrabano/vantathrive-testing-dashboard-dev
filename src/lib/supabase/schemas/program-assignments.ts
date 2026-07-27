import { z } from 'zod';
import { programTemplateSchema } from './program-templates';

export const programAssignmentSchema = z.object({
  id: z.string(),
  user_id: z.string().nullable(),
  organization_id: z.string().nullable(),
  program_template_id: z.string(),
  workout_schedule_id: z.string().nullable(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  status: z.string().nullable(),
  completion: z.unknown().nullable(),
  patient_override: z.unknown().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export type ProgramAssignment = z.infer<typeof programAssignmentSchema>;

// Workout schedule schema for joins
const workoutScheduleSchema = z.object({
  id: z.string(),
  schedule: z.unknown().nullable(),
  schedule_hash: z.string(),
  notes: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
  exercise_template_ids: z.array(z.string()).nullable(),
  exercise_template_counts: z.unknown().nullable(),
  group_ids: z.array(z.string()).nullable(),
  group_counts: z.unknown().nullable(),
});

// Combined type that includes both assignment and template data
export const programAssignmentWithTemplateSchema =
  programAssignmentSchema.extend({
    program_template: programTemplateSchema,
    workout_schedule: workoutScheduleSchema.nullable(),
    profiles: z.object({
      id: z.uuid(),
      first_name: z.string().nullable(),
      last_name: z.string().nullable(),
      email: z.string().nullable(),
    }).nullish(),
  });

export type ProgramAssignmentWithTemplate = z.infer<
  typeof programAssignmentWithTemplateSchema
>;
