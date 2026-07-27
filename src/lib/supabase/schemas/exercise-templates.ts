import { SelectedItem } from '@/app/program/[id]/template-config/types';
import { exerciseThumbnailUrlSchema } from '@/lib/supabase/schemas/exercises';
import { z } from 'zod';

export const exerciseTemplateSchema = z.object({
  id: z.string(),
  template_hash: z.string(),
  exercise_id: z.number(),
  notes: z.string().nullable(),
  sets: z.number().nullable(),
  time: z.number().nullable(),
  rep: z.number().nullable(),
  distance: z.string().nullable(),
  weight: z.string().nullable(),
  rest_time: z.number().nullable(),
  tempo: z.array(z.string()).length(4).nullable(),
  equipment_ids: z.array(z.number()).nullable(),
  rep_override: z.array(z.number()).nullable(),
  time_override: z.array(z.number()).nullable(),
  distance_override: z.array(z.string()).nullable(),
  weight_override: z.array(z.string()).nullable(),
  rest_time_override: z.array(z.number()).nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
  // Joined exercise data
  exercise_name: z.string().optional(),
  video_type: z.string().optional(),
  video_url: z.string().nullable().optional(),
  thumbnail_url: exerciseThumbnailUrlSchema,
});

export type ExerciseTemplate = z.infer<typeof exerciseTemplateSchema>;
export type Group = {
  id?: string;
  name: string;
  isSuperset: boolean;
  items: SelectedItem[];
};

export type UpsertExerciseTemplateResult =
  | {
      success: true;
      id: string;
      template_hash: string;
      cloned: boolean;
      reference_count: number;
      original_id?: string;
    }
  | {
      success: false;
      error: string;
      message: string;
    };
