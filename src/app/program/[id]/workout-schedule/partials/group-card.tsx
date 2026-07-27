'use client';

import type { Group as DbGroup } from '@/lib/supabase/queries/groups';
import type { ExerciseTemplate } from '@/lib/supabase/schemas/exercise-templates';
import { cn } from '@/lib/utils';
import { ExerciseTemplateHoverCard } from './exercise-template-hover-card';

export function GroupCard({
  group,
  templatesById,
  onAdd,
  index,
}: {
  group: DbGroup;
  templatesById: Record<string, ExerciseTemplate | undefined>;
  onAdd: () => void;
  index: number;
}) {
  const templateIds = group.exercise_template_ids ?? [];

  return (
    <div
      id={`group-card-${index}-${group.id}`}
      onClick={onAdd}
      className={cn(
        'border border-border rounded-[var(--radius-lg)] p-4 hover:bg-muted/60 transition-colors cursor-pointer',
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="text-sm font-medium text-foreground truncate" title={group.title}>
            {group.title}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {templateIds.length} exercise{templateIds.length === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      <div className="space-y-1">
        {templateIds.length === 0 ? (
          <div className="text-xs text-muted-foreground">No exercise templates</div>
        ) : (
          templateIds.slice(0, 8).map((id) => {
            const template = templatesById[id];
            const name = template?.exercise_name || 'Unnamed Exercise';

            return (
              <div
                key={id}
                className="flex items-center gap-2 text-xs text-foreground"
              >
                {template ? (
                  <ExerciseTemplateHoverCard
                    template={template}
                    className="h-5 w-5"
                  />
                ) : (
                  <div className="h-5 w-5 shrink-0" />
                )}
                <div className="truncate" title={name}>
                  {name}
                </div>
              </div>
            );
          })
        )}

        {templateIds.length > 8 && (
          <div className="text-xs text-muted-foreground">
            +{templateIds.length - 8} more
          </div>
        )}
      </div>
    </div>
  );
}

