'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import type { ExerciseTemplate } from '@/lib/supabase/schemas/exercise-templates';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ExerciseTemplateSetsTable } from './details-table';
import { PlayButton } from '@/components/ui/play-button';
import { cn } from '@/lib/utils';

export function ExerciseTemplateHoverCard({
  template,
  className,
}: {
  template: ExerciseTemplate;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const hasVideo = template.video_url && template.video_type;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'shrink-0 inline-flex items-center justify-center',
            'h-6 w-6 rounded-[var(--radius-sm)] hover:bg-muted/60 text-muted-foreground hover:text-primary',
            className,
          )}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Preview ${template.exercise_name ?? 'exercise'}`}
        >
          <Search className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[340px] p-3"
        sideOffset={8}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="text-sm font-semibold leading-snug">
            {template.exercise_name || 'Unnamed Exercise'}
          </div>
          {hasVideo && (
            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
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
            </div>
          )}
        </div>

        <ExerciseTemplateSetsTable template={template} />
      </PopoverContent>
    </Popover>
  );
}

