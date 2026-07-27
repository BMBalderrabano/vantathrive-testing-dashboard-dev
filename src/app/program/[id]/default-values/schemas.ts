import { z } from 'zod';

/**
 * Schema for default values form validation
 * Simplified version without per-set overrides (just "All" level)
 */
export const defaultValuesSchema = z.object({
  sets: z.number().int().min(1, 'Sets must be at least 1'),
  rep: z.number().int().min(0).nullable(),
  time: z.number().int().min(0).nullable(),
  distance: z.string().nullable(),
  distanceUnit: z.string(),
  weight: z.string().nullable(),
  weightUnit: z.string(),
  rest_time: z.number().int().min(0).nullable(),
  tempo: z.array(z.string().nullable()).length(4),
});

export type DefaultValuesData = z.infer<typeof defaultValuesSchema>;
