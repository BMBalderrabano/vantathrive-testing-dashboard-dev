'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Group } from '@/lib/supabase/schemas/exercise-templates';
import type { SelectedItem } from '@/app/program/[id]/template-config/types';
import { cn } from '@/lib/utils';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableItem } from './sortable-item';
import { SelectedItemComponent } from './selected-item';
import { generateItemId, getGroupItemIds } from './dnd-utils';

interface SelectedGroupProps {
  group: Group;
  index: number;
  groupId: string;
  onRemove: () => void;
  onToggleSuperset: () => void;
  onUpdateGroup: (group: Group) => void;
  onGroupItemClick?: (
    item: SelectedItem,
    groupIndex: number,
    itemIndex: number,
    event: React.MouseEvent,
  ) => void;
}

export function SelectedGroupComponent({
  group,
  index,
  groupId,
  onRemove,
  onToggleSuperset,
  onUpdateGroup,
  onGroupItemClick,
}: SelectedGroupProps): React.ReactNode {
  const { setNodeRef, isOver } = useDroppable({
    id: `droppable-${groupId}`,
    data: {
      type: 'group',
      groupId,
      groupIndex: index,
    },
  });

  const groupItemIds = getGroupItemIds(group.items, groupId);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'border border-border rounded-[var(--radius-lg)] p-4 mb-3 bg-muted/30 transition-all duration-200',
        isOver && 'border-primary/40 bg-muted/40 ring-2 ring-ring ring-offset-2 ring-offset-background',
      )}
      role="group"
      aria-label={`Group: ${group.name}. ${group.items.length} items.`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="font-semibold text-sm text-foreground">{group.name}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 ">
            <Checkbox
              id={`superset-${index}`}
              checked={group.isSuperset}
              onCheckedChange={onToggleSuperset}
              className="cursor-pointer"
            />
            <label
              htmlFor={`superset-${index}`}
              className="text-sm text-muted-foreground cursor-pointer"
            >
              Superset
            </label>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="text-destructive hover:text-destructive text-lg leading-none cursor-pointer"
            aria-label="Remove group"
          >
            ×
          </button>
        </div>
      </div>

      <SortableContext
        items={groupItemIds}
        strategy={verticalListSortingStrategy}
      >
        {group.items.length > 0 ? (
          <div
            className="space-y-2 mb-2"
            role="list"
            aria-label={`Items in ${group.name}`}
          >
            {group.items.map((item, itemIndex) => {
              const itemId = generateItemId(item, itemIndex, groupId);

              return (
                <SortableItem key={itemId} id={itemId}>
                  <SelectedItemComponent
                    item={item}
                    onRemove={() => {
                      const newItems = group.items.filter(
                        (_, i) => i !== itemIndex,
                      );
                      onUpdateGroup({
                        ...group,
                        items: newItems,
                      });
                    }}
                    onClick={
                      onGroupItemClick
                        ? (e) => onGroupItemClick(item, index, itemIndex, e)
                        : () => {}
                    }
                  />
                </SortableItem>
              );
            })}
          </div>
        ) : null}
      </SortableContext>

      <div
        className={cn(
          'w-full p-3 border-2 border-dashed rounded-[var(--radius-md)] text-center text-sm transition-all duration-200',
          'border-border hover:border-primary/40 hover:bg-muted/40 text-muted-foreground hover:text-foreground',
          isOver && 'border-primary/50 bg-muted/50',
        )}
        role="button"
        aria-label="Add exercises to group"
      >
        <span>+ Drop Exercises to Group</span>
      </div>
    </div>
  );
}
