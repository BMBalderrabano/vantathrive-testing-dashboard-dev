'use client';

import { useState } from 'react';
import type { ExerciseTemplate } from '@/lib/supabase/schemas/exercise-templates';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ExerciseTemplateSetsTable } from './details-table';
import { PlayButton } from '@/components/ui/play-button';

interface ExerciseDetailsPopoverProps {
  template: ExerciseTemplate;
  children: React.ReactNode;
  className?: string;
  sideOffset?: number;
}

export function ExerciseDetailsPopover({
  template,
  children,
  className,
  sideOffset = 8,
}: ExerciseDetailsPopoverProps) {
  const [open, setOpen] = useState(false);

  const hasVideo = template.video_url && template.video_type;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className={className}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto min-w-[180px] max-w-[280px] p-2"
        side="right"
        align="start"
        sideOffset={sideOffset}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="text-xs font-semibold leading-snug">
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

        <ExerciseTemplateSetsTable 
          template={template} 
          className="[&_td]:p-1 [&_th]:p-1 [&_td]:h-6 [&_th]:h-6 text-[10px]" 
        />
      </PopoverContent>
    </Popover>
  );
}
