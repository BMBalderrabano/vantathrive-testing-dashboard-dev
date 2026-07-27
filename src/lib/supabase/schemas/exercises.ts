import { z } from 'zod';

export const exerciseThumbnailUrlSchema = z
  .object({
    blurhash: z.string().optional(),
    image_url: z.string().optional(),
  })
  .nullable()
  .optional();

export const exerciseSchema = z.object({
  id: z.number(),
  exercise_name: z.string(),
  video_type: z.string(),
  video_url: z.string().nullable(),
  thumbnail_url: exerciseThumbnailUrlSchema,
  library_tip: z.string().nullable(),
  library_check_in_question: z.string().nullable(),
  type: z.string().nullable(),
  exercise_id: z.number().nullable(),
  match_score: z.number().nullable(),
  matched_library_exercise_name: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
  assigned_count: z.number().optional(),
});

export type Exercise = z.infer<typeof exerciseSchema>;
