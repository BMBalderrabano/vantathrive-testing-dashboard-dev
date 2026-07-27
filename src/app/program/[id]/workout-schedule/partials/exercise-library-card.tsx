'use client';

import { ExerciseThumbnail } from '@/components/ui/exercise-thumbnail';
import type { Exercise } from '@/lib/supabase/schemas/exercises';
import { cn } from '@/lib/utils';

interface ExerciseLibraryCardProps {
  exercise: Exercise;
  onAdd: () => void;
  index: number;
}

export function ExerciseLibraryCard({
  exercise,
  onAdd,
  index,
}: ExerciseLibraryCardProps) {
  const thumb = exercise.thumbnail_url && typeof exercise.thumbnail_url === 'object' ? exercise.thumbnail_url : null;

  return (
    <div
      onClick={onAdd}
      id={`exercise-library-card-${index}-${exercise.id}`}
      className={cn(
        'border border-border rounded-lg p-4 cursor-pointer hover:bg-muted/60 transition-colors',
      )}
    >
      <div className="mb-2 rounded-(--radius-md) overflow-hidden">
        <ExerciseThumbnail
          blurhash={thumb?.blurhash ?? null}
          imageUrl={thumb?.image_url ?? null}
          videoUrl={exercise.video_url ?? null}
          videoType={exercise.video_type}
          alt={exercise.exercise_name}
          className="rounded-(--radius-md)"
          fill
          showVideoFallback={true}
        />
      </div>
      <div
        className="text-sm font-medium text-foreground truncate mb-1"
        title={exercise.exercise_name}
      >
        {exercise.exercise_name}
      </div>
    </div>
  );
}
