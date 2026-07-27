import { z } from 'zod';

const teamMemberSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  profile: z
    .object({
      id: z.string(),
      avatar_url: z.string().nullable(),
      first_name: z.string().nullable(),
      last_name: z.string().nullable(),
      email: z.string().nullable(),
    })
    .nullable(),
});

export const teamSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  notes: z.string().nullable(),
  organization_id: z.uuid(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
  members_count: z.number().optional(),
  member_ids: z.array(z.string()).optional(),
  members: z.array(teamMemberSchema).optional(),
});

export type Team = z.infer<typeof teamSchema>;
export type TeamMember = z.infer<typeof teamMemberSchema>;
