'use client';

import type { ExerciseTemplate } from '@/lib/supabase/schemas/exercise-templates';
import { ExerciseTemplateSetsTable } from './details-table';
import { PlayButton } from '@/components/ui/play-button';
import { cn } from '@/lib/utils';

interface ExerciseTemplateCardProps {
  template: ExerciseTemplate;
  onAdd: () => void;
  index: number;
}

export function ExerciseTemplateCard({
  template,
  onAdd,
  index,
}: ExerciseTemplateCardProps) {
  const hasVideo = template.video_url && template.video_type;

  return (
    <div
      id={`exercise-template-card-${index}-${template.id}`}
      className={cn(
        'border border-border rounded-lg p-4 hover:bg-muted/60 transition-colors cursor-pointer',
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div
          onClick={onAdd}
          className="text-sm font-medium text-foreground truncate flex-1"
          title={template.exercise_name || 'Unnamed Exercise'}
        >
          {template.exercise_name || 'Unnamed Exercise'}
        </div>
        {hasVideo && (
          <PlayButton
            videoUrl={template.video_url || null}
            videoType={template.video_type}
            exerciseName={template.exercise_name || 'Unnamed Exercise'}
            thumbnailUrl={
              template.thumbnail_url && typeof template.thumbnail_url === 'object'
                ? template.thumbnail_url
                : undefined
            }
          />
        )}
      </div>
      <div onClick={onAdd} className="cursor-pointer">
        <ExerciseTemplateSetsTable template={template} />
      </div>
    </div>
  );
}
