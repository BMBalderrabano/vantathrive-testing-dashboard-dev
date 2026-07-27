import { z } from 'zod';
import { Database } from '../database.types';
import { organizationMemberRoleSchema } from './organization-members';

const journeyPhaseValues = [
  'discovery',
  'onboarding',
  'scaffolding',
] as const satisfies readonly Database['public']['Enums']['journey_phase'][];

export const journeyPhaseSchema = z.enum(journeyPhaseValues, {
  message: 'Invalid journey phase',
});

export const profileSchema = z.object({
  id: z.uuid(),
  description: z.string().nullable(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  email: z.email(),
  status: z.enum(['pending', 'invited', 'active', 'assigned']).nullish(),
  phone: z.string().nullable(),
  journey_phase: journeyPhaseSchema.nullable(),
  screening_completed: z.boolean().nullable(),
  intro_completed: z.boolean().nullable(),
  consultation_completed: z.boolean().nullable(),
  program_assigned: z.boolean().nullable(),
  program_started: z.boolean().nullable(),
  program_due_date: z.string().nullable(),
  avatar_url: z.string().nullable(),
  certificate_url: z.any().nullable(),
  timezone: z.string().nullish(),
  last_sign_in: z.string().nullish(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

export type JourneyPhase = z.infer<typeof journeyPhaseSchema>;
export type Profile = z.infer<typeof profileSchema>;

export const profileWithStatsSchema = profileSchema.extend({
  current_level: z.number().nullable(),
  current_phase: z.string().nullable(),
  empowerment: z.number().nullable(),
  empowerment_base: z.number().nullable(),
  empowerment_metadata: z.any().nullable(),
  empowerment_threshold: z.number().nullable(),
  empowerment_title: z.string().nullable(),
  empowerment_top: z.number().nullable(),
  hp_points: z.number().nullable(),
  max_gate_type: z.string().nullable(),
  max_gate_unlocked: z.number().nullable(),
  points_required_for_next_level: z.number().nullable(),
  program_completion_percentage: z.number().nullable(),
  program_weeks: z.number().nullable(),
  program_assignment_id: z.uuid().nullable().optional(),
  program_assignment_name: z.string().nullable().optional(),
  is_super_admin: z.boolean().optional(),
  orgMemberships: z
    .array(z.object({ orgId: z.string(), orgName: z.string() }))
    .optional(),
  role: organizationMemberRoleSchema.optional(),
});

export type RawOrgMember = {
  user_id: string;
  organization_id: string;
  organizations: {
    id: string;
    name: string;
  } | null;
};

export type ProfileWithStats = z.infer<typeof profileWithStatsSchema>;
