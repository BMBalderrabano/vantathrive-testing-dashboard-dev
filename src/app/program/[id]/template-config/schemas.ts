import { z } from 'zod';

/**
 * Schema for template form validation
 */
export const templateFormSchema = z.object({
  sets: z.number().int().min(1, 'Sets must be at least 1'),
  rep: z.number().int().min(0).nullable(),
  time: z.number().int().min(0).nullable(),
  distance: z.string().nullable().optional(),
  distanceUnit: z.string().default('m'),
  weight: z.string().nullable().optional(),
  weightUnit: z.string().default('kg'),
  rest_time: z.number().int().min(0).nullable(),
  tempo: z.array(z.string().nullable()).length(4),
  rep_override: z.array(z.number().int().min(0).nullable()),
  time_override: z.array(z.number().int().min(0).nullable()),
  distance_override: z.array(z.string().nullable()),
  distance_override_units: z.array(z.string()),
  weight_override: z.array(z.string().nullable()),
  weight_override_units: z.array(z.string()),
  rest_time_override: z.array(z.number().int().min(0).nullable()),
});

export type TemplateFormData = z.input<typeof templateFormSchema>;
