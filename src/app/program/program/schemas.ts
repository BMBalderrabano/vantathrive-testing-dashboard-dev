import { z } from 'zod';

export const programTemplateFormSchema = z
  .object({
    name: z.string().min(1, 'Name is required').trim(),
    weeks: z.number().int().min(1, 'Weeks must be at least 1'),
    description: z.string().trim().optional(),
    goals: z.string().trim().optional(),
    notes: z.string().trim().optional(),
    organizationId: z.string().uuid().nullable().optional(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    {
      message: 'End date must be after start date',
      path: ['endDate'],
    },
  );

export type ProgramTemplateFormData = z.infer<typeof programTemplateFormSchema>;
