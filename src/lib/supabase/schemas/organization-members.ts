import { z } from 'zod';
import { Database } from '../database.types';

const organizationRoleValues = [
  'admin',
  'patient',
] as const satisfies readonly Database['public']['Enums']['organization_role'][];

export type MemberRole = (typeof organizationRoleValues)[number];

export const organizationMemberRoleSchema = z.enum(organizationRoleValues, {
  message: 'Invalid organization role',
});

export const organizationMemberSchema = z.object({
  role: organizationMemberRoleSchema,
});

export type OrganizationMemberRole = z.infer<
  typeof organizationMemberRoleSchema
>;
export type OrganizationMember = z.infer<typeof organizationMemberSchema>;
