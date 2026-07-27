'use client';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { CopyPasteButtons } from '@/components/ui/copy-paste-buttons';
import { motion } from 'framer-motion';
import { getDayOfWeek } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { SelectedItem } from '@/app/program/[id]/template-config/types';
import type { DefaultValuesData } from '@/app/program/[id]/default-values/schemas';
import type { ExerciseTemplate } from '@/lib/supabase/schemas/exercise-templates';
import { ExerciseDetailsPopover } from './partials/exercise-details-popover';

interface DayBoxProps {
  day: number;
  weekIndex: number;
  items: SelectedItem[];
  formattedDate: string | null;
  isBeforeStart: boolean;
  isPastDate: boolean;
  isDayCopied: boolean;
  isDayPasteDisabled: boolean;
  isPasteAnimating?: boolean;
  index: number;
  onAddExercise: (day: number) => void;
  onCopyDay: () => void;
  onPasteDay: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  defaultValues?: DefaultValuesData;
}

export function DayBox({
  day,
  weekIndex,
  items,
  formattedDate,
  isBeforeStart,
  isPastDate,
  isDayCopied,
  isDayPasteDisabled,
  isPasteAnimating = false,
  index,
  onAddExercise,
  onCopyDay,
  onPasteDay,
  onMouseEnter,
  onMouseLeave,
  defaultValues,
}: DayBoxProps) {
  const hasItems = items.length > 0;
  const isWarning = isBeforeStart || isPastDate;
  const warningLabel = isBeforeStart
    ? ' (Before Start)'
    : isPastDate
      ? ' (Past Date)'
      : '';

  const copyPasteButtons = (
    <CopyPasteButtons
      size="sm"
      onCopy={onCopyDay}
      onPaste={onPasteDay}
      isCopied={isDayCopied}
      isPasteDisabled={isDayPasteDisabled}
      pasteJustTriggered={isPasteAnimating}
      copyTooltip="Copy Day"
      pasteTooltip="Paste Day"
      copiedTooltip="Day already copied"
      showCopy={hasItems}
      showPaste={true}
    />
  );

  // Helper to create a synthetic template from exercise + default values
  const getTemplateFromExercise = (
    item: Extract<SelectedItem, { type: 'exercise' }>,
  ): ExerciseTemplate => {
    // If we have default values, use them to populate the synthetic template
    const base: Partial<ExerciseTemplate> = defaultValues
      ? {
          sets: defaultValues.sets,
          rep: defaultValues.rep,
          time: defaultValues.time,
          distance: defaultValues.distance,
          weight: defaultValues.weight,
          rest_time: defaultValues.rest_time,
          tempo: defaultValues.tempo as string[],
        }
      : {};

    return {
      ...base,
      id: `synthetic-${item.data.id}`,
      template_hash: 'synthetic',
      exercise_id: item.data.id,
      notes: null,
      equipment_ids: null,
      rep_override: null,
      time_override: null,
      distance_override: null,
      weight_override: null,
      rest_time_override: null,
      created_at: null,
      updated_at: null,
      exercise_name: item.data.exercise_name,
      video_type: item.data.video_type,
      video_url: item.data.video_url,
      thumbnail_url: item.data.thumbnail_url ?? undefined,
      // Default to null if not provided by defaultValues
      sets: base.sets ?? null,
      time: base.time ?? null,
      rep: base.rep ?? null,
      distance: base.distance ?? null,
      weight: base.weight ?? null,
      rest_time: base.rest_time ?? null,
      tempo: base.tempo ?? null,
    };
  };

  const renderItem = (
    item: SelectedItem,
    itemIndex: number,
    inGroup = false,
  ) => {
    if (item.type === 'group') {
      return (
        <div key={`group-${itemIndex}`} className="flex flex-col gap-1 mb-2">
          <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground pl-1">
            {item.data.name}
          </div>
          <div className="pl-2 border-l-2 border-border/60 flex flex-col gap-1">
            {item.data.items.map((subItem, subIdx) =>
              renderItem(subItem, subIdx, true),
            )}
          </div>
        </div>
      );
    }

    const template =
      item.type === 'template'
        ? item.data
        : getTemplateFromExercise(item as Extract<SelectedItem, { type: 'exercise' }>);
    const displayName = template.exercise_name || 'Unnamed Exercise';

    return (
      <ExerciseDetailsPopover key={`${inGroup ? 'sub' : 'item'}-${itemIndex}`} template={template} className="w-full">
        <div
          className={cn(
            'text-xs py-1 px-2 rounded-md truncate cursor-pointer transition-colors text-left w-full',
            'hover:bg-primary/10 hover:text-primary text-foreground/80',
          )}
        >
          {displayName}
        </div>
      </ExerciseDetailsPopover>
    );
  };

  return (
    <div className="flex flex-col flex-1 min-w-[220px]">
      <div className="relative mb-1">
        <h3
          className={cn(
            'text-base font-semibold text-center',
            isWarning ? 'text-destructive' : 'text-foreground',
          )}
        >
          {getDayOfWeek(day)}
        </h3>
      </div>
      {formattedDate && (
        <p
          className={cn(
            'text-xs mb-3 text-center',
            isWarning ? 'text-destructive/70' : 'text-muted-foreground',
          )}
        >
          {formattedDate}{warningLabel}
        </p>
      )}
      <div
        className={cn(
          'group relative border-2 rounded-xl p-4 min-h-[280px] flex flex-col items-center gap-3 transition-colors duration-200',
          isWarning
            ? 'border-dashed border-destructive/40 bg-destructive/5 justify-center'
            : hasItems
              ? 'border-primary bg-muted/30 justify-start' // Blue border for non-rest
              : 'border-dashed border-border bg-muted/30 justify-center', // Dashed for rest
        )}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {hasItems ? (
          <>
             <motion.div
              className="w-full flex-1 flex flex-col gap-1 overflow-y-auto max-h-[240px] min-h-[240px] slim-scrollbar"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 * index }}
            >
              {items.map((item, idx) => renderItem(item, idx))}
            </motion.div>
          </>
        ) : (
          <>
            <motion.p
              key={`week-${weekIndex}-day-${day}-rest`}
              className={cn(
                'h-full max-h-[240px] min-h-[240px] flex flex-col items-center justify-center text-sm cursor-default',
                isWarning ? 'text-destructive/70' : 'text-muted-foreground',
              )}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 * index }}
            >
              Rest Day
            </motion.p>
          </>
        )}
        <div className="w-full mt-auto flex items-center gap-2">
          {copyPasteButtons}
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'border-dashed flex-1',
              isWarning
                ? 'border-destructive/40 text-destructive cursor-not-allowed bg-destructive/5'
                : hasItems 
                  ? 'border-primary/40 text-primary hover:bg-primary/10 hover:text-primary cursor-pointer'
                  : 'border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground cursor-pointer',
            )}
            onClick={() => onAddExercise(day)}
          >
            <Plus className="h-4 w-4 mr-2" />
            {hasItems ? 'Edit' : 'Add Exercise'}
          </Button>
        </div>
      </div>
    </div>
  );
}
