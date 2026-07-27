'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from 'react';
import {
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import type { SelectedItem } from '@/app/program/[id]/template-config/types';
import {
  flattenItems,
  getTopLevelIds,
  generateItemId,
  moveItem,
  moveItemToGroup,
  findFlatItemById,
  isDroppableGroupId,
  isTopLevelDroppable,
  getGroupIdFromDroppable,
  createGroupCollisionDetection,
} from './dnd-utils';

interface DragContextValue {
  isDragging: boolean;
  activeId: string | null;
  activeItem: SelectedItem | null;
  activeFlatItem: ReturnType<typeof findFlatItemById> | null;
  isDraggingFromGroup: boolean;
  topLevelIds: string[];
  sensors: ReturnType<typeof useSensors>;
  collisionDetection: ReturnType<typeof createGroupCollisionDetection>;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  handleDragCancel: () => void;
  onItemsReorder: (items: SelectedItem[]) => void;
}

const DragContext = createContext<DragContextValue | null>(null);

export function useDragContext() {
  const context = useContext(DragContext);
  if (!context) {
    throw new Error('useDragContext must be used within DragContextProvider');
  }
  return context;
}

export function useDragContextOptional() {
  const context = useContext(DragContext);
  return context;
}

interface DragContextProviderProps {
  items: SelectedItem[];
  onItemsReorder: (items: SelectedItem[]) => void;
  children: React.ReactNode;
}

export function DragContextProvider({
  items,
  onItemsReorder,
  children,
}: DragContextProviderProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const flatItems = useMemo(() => flattenItems(items), [items]);
  const topLevelIds = useMemo(() => getTopLevelIds(items), [items]);
  const collisionDetection = useMemo(
    () => createGroupCollisionDetection(flatItems),
    [flatItems],
  );

  const activeItem = useMemo(() => {
    if (!activeId) return null;
    const flatItem = findFlatItemById(flatItems, activeId);
    return flatItem?.item ?? null;
  }, [activeId, flatItems]);

  const activeFlatItem = useMemo(() => {
    if (!activeId) return null;
    return findFlatItemById(flatItems, activeId);
  }, [activeId, flatItems]);

  const isDragging = activeId !== null;
  const isDraggingFromGroup = activeFlatItem?.parentId !== null;

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) {
        setActiveId(null);
        return;
      }

      const overId = over.id as string;
      const activeIdStr = active.id as string;

      const activeItem = findFlatItemById(flatItems, activeIdStr);

      let newItems: SelectedItem[];

      // Check if dropping on top-level droppable (moving from group to top level)
      if (isTopLevelDroppable(overId)) {
        if (activeItem && activeItem.parentId !== null) {
          // Moving from group to top level - add to end
          const sourceGroupIndex = items.findIndex(
            (item, idx) =>
              item.type === 'group' &&
              generateItemId(item, idx) === activeItem.parentId,
          );

          if (sourceGroupIndex !== -1) {
            const sourceGroup = items[sourceGroupIndex];
            if (sourceGroup.type === 'group') {
              const activeIndexInGroup = sourceGroup.data.items.findIndex(
                (_, idx) =>
                  generateItemId(
                    sourceGroup.data.items[idx],
                    idx,
                    activeItem.parentId ?? undefined,
                  ) === activeIdStr,
              );

              if (activeIndexInGroup !== -1) {
                const newItemsCopy = JSON.parse(
                  JSON.stringify(items),
                ) as SelectedItem[];
                const sourceGroupCopy = newItemsCopy[sourceGroupIndex];
                if (sourceGroupCopy.type === 'group') {
                  const [movedItem] = sourceGroupCopy.data.items.splice(
                    activeIndexInGroup,
                    1,
                  );
                  newItemsCopy.push(movedItem);
                  onItemsReorder(newItemsCopy);
                  setActiveId(null);
                  return;
                }
              }
            }
          }
        }
        setActiveId(null);
        return;
      }

      // Check if dropping on a droppable group container
      if (isDroppableGroupId(overId)) {
        // If dragging a group, treat it as reordering instead of moving into group
        if (activeItem?.item.type === 'group') {
          const targetGroupId = getGroupIdFromDroppable(overId);
          if (targetGroupId) {
            newItems = moveItem(items, activeIdStr, targetGroupId, flatItems);
          } else {
            setActiveId(null);
            return;
          }
        } else {
          const targetGroupId = getGroupIdFromDroppable(overId);
          if (targetGroupId) {
            newItems = moveItemToGroup(
              items,
              activeIdStr,
              targetGroupId,
              flatItems,
            );
          } else {
            setActiveId(null);
            return;
          }
        }
      } else {
        newItems = moveItem(items, activeIdStr, overId, flatItems);
      }

      onItemsReorder(newItems);
      setActiveId(null);
    },
    [items, flatItems, onItemsReorder],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const value: DragContextValue = {
    isDragging,
    activeId,
    activeItem,
    activeFlatItem,
    isDraggingFromGroup,
    topLevelIds,
    sensors,
    collisionDetection,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
    onItemsReorder,
  };

  return <DragContext.Provider value={value}>{children}</DragContext.Provider>;
}
