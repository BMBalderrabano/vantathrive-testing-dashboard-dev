import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { SelectedItem } from '../../template-config/types';
import { generateItemId } from './dnd-utils';
import { SelectedGroupComponent } from './selected-group';
import { SelectedItemComponent } from './selected-item';
import { SortableItem } from './sortable-item';

interface TopLevelDroppableProps {
  isDraggingFromGroup: boolean;
  items: SelectedItem[];
  topLevelIds: string[];
  onRemove: (index: number) => void;
  onRemoveGroup?: (index: number) => void;
  onToggleSuperset?: (index: number) => void;
  onItemsReorder: (items: SelectedItem[]) => void;
  onGroupItemClick?: (
    groupItem: SelectedItem,
    groupIdx: number,
    itemIdx: number,
    event: React.MouseEvent,
  ) => void;
  handleItemClick: (index: number, event: React.MouseEvent) => void;
}

export function TopLevelDroppable({
  isDraggingFromGroup,
  items,
  topLevelIds,
  onRemove,
  onRemoveGroup,
  onToggleSuperset,
  onItemsReorder,
  onGroupItemClick,
  handleItemClick,
}: TopLevelDroppableProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'droppable-top-level',
    data: {
      type: 'top-level',
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'border-2 border-dashed rounded-[var(--radius-xl)] p-4 transition-all duration-200 border-border bg-muted/30 min-h-full w-full',
        isOver &&
          isDraggingFromGroup &&
          'ring-2 ring-ring ring-offset-2 ring-offset-background bg-muted/40',
      )}
    >
      {items.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          <p>No items selected</p>
          <p className="text-sm mt-2 text-muted-foreground">
            Click cards to add items
          </p>
        </div>
      ) : (
        <SortableContext
          items={topLevelIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3 mb-6">
            {items.map((item, index) => {
              const itemId = generateItemId(item, index);

              if (item.type === 'group') {
                return (
                  <SortableItem key={itemId} id={itemId}>
                    <SelectedGroupComponent
                      group={item.data}
                      index={index}
                      groupId={itemId}
                      onRemove={() => onRemoveGroup?.(index) ?? onRemove(index)}
                      onToggleSuperset={() => onToggleSuperset?.(index)}
                      onUpdateGroup={(updatedGroup) => {
                        const newItems = [...items];
                        newItems[index] = {
                          type: 'group',
                          data: updatedGroup,
                        };
                        onItemsReorder(newItems);
                      }}
                      onGroupItemClick={onGroupItemClick}
                    />
                  </SortableItem>
                );
              }
              return (
                <SortableItem key={itemId} id={itemId}>
                  <SelectedItemComponent
                    item={item}
                    onRemove={() => onRemove(index)}
                    onClick={(e) => handleItemClick(index, e)}
                  />
                </SortableItem>
              );
            })}
          </div>
        </SortableContext>
      )}
    </div>
  );
}
