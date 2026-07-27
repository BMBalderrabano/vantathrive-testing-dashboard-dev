'use client';

import { generateExerciseTemplateDescription, generateDefaultValuesDescription } from '@/lib/utils/exercise-template-description';
import { PlayButton } from '@/components/ui/play-button';
import type { SelectedItem } from '@/app/program/[id]/template-config/types';
import { cn } from '@/lib/utils';
import { useDefaultValues } from '@/app/program/[id]/default-values/use-default-values';

interface SelectedItemProps {
  item: SelectedItem;
  onRemove: () => void;
  onClick: (event: React.MouseEvent) => void;
}

export function SelectedItemComponent({
  item,
  onRemove,
  onClick,
}: SelectedItemProps) {
  const { values: defaultValues } = useDefaultValues();

  if (item.type === 'group') {
    return null;
  }

  // TypeScript now knows item is either 'exercise' or 'template'
  const exerciseName =
    item.type === 'exercise'
      ? item.data.exercise_name
      : item.data.exercise_name || 'Unnamed Exercise';

  const hasVideo =
    (item.type === 'exercise' || item.type === 'template') &&
    item.data.video_url &&
    item.data.video_type;

  // Get description based on item type
  const getDescription = () => {
    if (item.type === 'template') {
      return generateExerciseTemplateDescription(item.data);
    }
    // For exercises, use default values
    return generateDefaultValuesDescription(defaultValues);
  };

  return (
    <div
      className={cn(
        'border border-primary/40 bg-muted/30 rounded-[var(--radius-lg)] p-4 flex items-center gap-3',
        'cursor-pointer',
      )}
      onClick={onClick}
    >
      <div className="flex-1 flex items-center gap-3">
        {hasVideo && (item.type === 'exercise' || item.type === 'template') && (
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <PlayButton
              videoUrl={item.data.video_url || null}
              videoType={item.data.video_type}
              exerciseName={exerciseName}
              thumbnailUrl={
                item.data.thumbnail_url && typeof item.data.thumbnail_url === 'object'
                  ? item.data.thumbnail_url
                  : undefined
              }
            />
          </div>
        )}
        <div className="flex-1">
          <div className="font-medium text-sm text-foreground">{exerciseName}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {getDescription()}
          </div>
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="text-destructive hover:text-destructive text-lg leading-none cursor-pointer"
      >
        ×
      </button>
    </div>
  );
}
