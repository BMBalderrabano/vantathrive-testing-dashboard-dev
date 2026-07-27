import type { SelectedItem } from '@/app/program/[id]/template-config/types';
import type { CollisionDetection } from '@dnd-kit/core';
import { closestCenter, pointerWithin } from '@dnd-kit/core';

/**
 * Represents a flattened item for drag and drop operations
 */
interface FlatItem {
  id: string;
  parentId: string | null;
  index: number;
  item: SelectedItem;
}

/**
 * Generates a unique ID for a SelectedItem based on its type and data
 */
export function generateItemId(
  item: SelectedItem,
  index: number,
  parentId?: string,
): string {
  if (item.type === 'group') {
    return item.data.id || `group-${index}`;
  }
  if (item.type === 'template' && item.data.id) {
    return parentId
      ? `${parentId}-template-${item.data.id}`
      : `template-${item.data.id}-${index}`;
  }
  if (item.type === 'exercise' && item.data.id) {
    return parentId
      ? `${parentId}-exercise-${item.data.id}`
      : `exercise-${item.data.id}-${index}`;
  }
  return parentId ? `${parentId}-item-${index}` : `top-${index}`;
}

/**
 * Flattens a nested SelectedItem[] array into a flat array with parentId references
 */
export function flattenItems(items: SelectedItem[]): FlatItem[] {
  const flatItems: FlatItem[] = [];

  items.forEach((item, index) => {
    const itemId = generateItemId(item, index);

    flatItems.push({
      id: itemId,
      parentId: null,
      index,
      item,
    });

    // If it's a group, add its children with parentId
    if (item.type === 'group' && item.data.items.length > 0) {
      item.data.items.forEach((childItem, childIndex) => {
        const childId = generateItemId(childItem, childIndex, itemId);
        flatItems.push({
          id: childId,
          parentId: itemId,
          index: childIndex,
          item: childItem,
        });
      });
    }
  });

  return flatItems;
}

/**
 * Gets all sortable IDs for the top level (groups + non-group items)
 */
export function getTopLevelIds(items: SelectedItem[]): string[] {
  return items.map((item, index) => generateItemId(item, index));
}

/**
 * Gets all sortable IDs for items within a group
 */
export function getGroupItemIds(
  groupItems: SelectedItem[],
  groupId: string,
): string[] {
  return groupItems.map((item, index) => generateItemId(item, index, groupId));
}

/**
 * Finds a flat item by its ID
 */
export function findFlatItemById(
  flatItems: FlatItem[],
  id: string,
): FlatItem | undefined {
  return flatItems.find((item) => item.id === id);
}

/**
 * Checks if an ID is a droppable group container ID
 */
export function isDroppableGroupId(id: string): boolean {
  return id.startsWith('droppable-') && id !== 'droppable-top-level';
}

/**
 * Checks if an ID is the top-level droppable zone
 */
export function isTopLevelDroppable(id: string): boolean {
  return id === 'droppable-top-level';
}

/**
 * Extracts the group ID from a droppable container ID
 */
export function getGroupIdFromDroppable(droppableId: string): string | null {
  if (droppableId.startsWith('droppable-')) {
    return droppableId.replace('droppable-', '');
  }
  return null;
}

/**
 * Moves an item into a group container (when dropped on the droppable area)
 */
export function moveItemToGroup(
  items: SelectedItem[],
  activeId: string,
  targetGroupId: string,
  flatItems: FlatItem[],
): SelectedItem[] {
  const activeItem = findFlatItemById(flatItems, activeId);

  if (!activeItem) {
    return items;
  }

  // Don't allow moving groups into groups
  if (activeItem.item.type === 'group') {
    return items;
  }

  const newItems = JSON.parse(JSON.stringify(items)) as SelectedItem[];
  const activeParentId = activeItem.parentId;

  // Find the target group
  const targetGroupIndex = newItems.findIndex(
    (item, idx) =>
      item.type === 'group' && generateItemId(item, idx) === targetGroupId,
  );

  if (targetGroupIndex === -1) {
    return items;
  }

  const targetGroup = newItems[targetGroupIndex];
  if (targetGroup.type !== 'group') {
    return items;
  }

  // If already in the target group, do nothing
  if (activeParentId === targetGroupId) {
    return items;
  }

  // Remove from current position
  if (activeParentId === null) {
    // Remove from top level
    const activeIndex = newItems.findIndex(
      (_, idx) => generateItemId(newItems[idx], idx) === activeId,
    );
    if (activeIndex !== -1) {
      newItems.splice(activeIndex, 1);
    }
  } else {
    // Remove from source group
    const sourceGroupIndex = newItems.findIndex(
      (item, idx) =>
        item.type === 'group' && generateItemId(item, idx) === activeParentId,
    );
    if (sourceGroupIndex !== -1) {
      const sourceGroup = newItems[sourceGroupIndex];
      if (sourceGroup.type === 'group') {
        const activeIndexInGroup = sourceGroup.data.items.findIndex(
          (_, idx) =>
            generateItemId(sourceGroup.data.items[idx], idx, activeParentId) ===
            activeId,
        );
        if (activeIndexInGroup !== -1) {
          sourceGroup.data.items.splice(activeIndexInGroup, 1);
        }
      }
    }
  }

  // Find the target group again (index may have changed after removal)
  const updatedTargetGroupIndex = newItems.findIndex(
    (item, idx) =>
      item.type === 'group' && generateItemId(item, idx) === targetGroupId,
  );

  if (updatedTargetGroupIndex !== -1) {
    const updatedTargetGroup = newItems[updatedTargetGroupIndex];
    if (updatedTargetGroup.type === 'group') {
      updatedTargetGroup.data.items.push(activeItem.item);
    }
  } else {
    // Target group was the same as source at top level, find by name
    const fallbackGroupIndex = newItems.findIndex(
      (item) =>
        item.type === 'group' && item.data.name === targetGroup.data.name,
    );
    if (fallbackGroupIndex !== -1) {
      const fallbackGroup = newItems[fallbackGroupIndex];
      if (fallbackGroup.type === 'group') {
        fallbackGroup.data.items.push(activeItem.item);
      }
    }
  }

  return newItems;
}

/**
 * Moves an item from one position to another in the items array
 * Handles: top-level reordering, moving into groups, moving out of groups, moving between groups
 */
export function moveItem(
  items: SelectedItem[],
  activeId: string,
  overId: string,
  flatItems: FlatItem[],
): SelectedItem[] {
  const activeItem = findFlatItemById(flatItems, activeId);
  const overItem = findFlatItemById(flatItems, overId);

  if (!activeItem || !overItem) {
    return items;
  }

  const newItems = JSON.parse(JSON.stringify(items)) as SelectedItem[];

  // Determine source and destination contexts
  const activeParentId = activeItem.parentId;
  const overParentId = overItem.parentId;

  // Case 1: Moving within the same level (both top-level or same group)
  if (activeParentId === overParentId) {
    if (activeParentId === null) {
      // Top-level reordering
      const oldIndex = newItems.findIndex(
        (_, idx) => generateItemId(newItems[idx], idx) === activeId,
      );
      const newIndex = newItems.findIndex(
        (_, idx) => generateItemId(newItems[idx], idx) === overId,
      );

      if (oldIndex !== -1 && newIndex !== -1) {
        const [movedItem] = newItems.splice(oldIndex, 1);
        newItems.splice(newIndex, 0, movedItem);
      }
    } else {
      // Reordering within a group
      const groupIndex = newItems.findIndex(
        (item, idx) =>
          item.type === 'group' && generateItemId(item, idx) === activeParentId,
      );

      if (groupIndex !== -1) {
        const group = newItems[groupIndex];
        if (group.type === 'group') {
          const groupItems = group.data.items;
          const oldIndex = groupItems.findIndex(
            (_, idx) =>
              generateItemId(groupItems[idx], idx, activeParentId) === activeId,
          );
          const newIndex = groupItems.findIndex(
            (_, idx) =>
              generateItemId(groupItems[idx], idx, activeParentId) === overId,
          );

          if (oldIndex !== -1 && newIndex !== -1) {
            const [movedItem] = groupItems.splice(oldIndex, 1);
            groupItems.splice(newIndex, 0, movedItem);
          }
        }
      }
    }
    return newItems;
  }

  // Case 2: Moving from top-level into a group
  if (activeParentId === null && overParentId !== null) {
    const activeIndex = newItems.findIndex(
      (_, idx) => generateItemId(newItems[idx], idx) === activeId,
    );

    // Don't allow moving groups into groups
    if (activeIndex !== -1 && newItems[activeIndex].type !== 'group') {
      const movedItem = newItems[activeIndex];
      newItems.splice(activeIndex, 1);

      // Find the target group (recalculate indices after removal)
      const targetGroupIndex = newItems.findIndex(
        (item, idx) =>
          item.type === 'group' && generateItemId(item, idx) === overParentId,
      );

      if (targetGroupIndex !== -1) {
        const group = newItems[targetGroupIndex];
        if (group.type === 'group') {
          // Find position within group
          const overIndexInGroup = group.data.items.findIndex(
            (_, idx) =>
              generateItemId(group.data.items[idx], idx, overParentId) ===
              overId,
          );
          if (overIndexInGroup !== -1) {
            group.data.items.splice(overIndexInGroup, 0, movedItem);
          } else {
            group.data.items.push(movedItem);
          }
        }
      }
    }
    return newItems;
  }

  // Case 3: Moving from a group to top-level
  if (activeParentId !== null && overParentId === null) {
    // Don't allow if dropping ON a group (not between items)
    if (overItem.item.type === 'group') {
      // If dropping on a group, add to that group instead
      const overGroupIndex = newItems.findIndex(
        (_, idx) => generateItemId(newItems[idx], idx) === overId,
      );

      if (overGroupIndex !== -1) {
        const sourceGroupIndex = newItems.findIndex(
          (item, idx) =>
            item.type === 'group' &&
            generateItemId(item, idx) === activeParentId,
        );

        if (sourceGroupIndex !== -1) {
          const sourceGroup = newItems[sourceGroupIndex];
          if (sourceGroup.type === 'group') {
            const activeIndexInGroup = sourceGroup.data.items.findIndex(
              (_, idx) =>
                generateItemId(
                  sourceGroup.data.items[idx],
                  idx,
                  activeParentId,
                ) === activeId,
            );

            if (activeIndexInGroup !== -1) {
              const [movedItem] = sourceGroup.data.items.splice(
                activeIndexInGroup,
                1,
              );

              const targetGroup = newItems[overGroupIndex];
              if (targetGroup.type === 'group') {
                targetGroup.data.items.push(movedItem);
              }
            }
          }
        }
      }
      return newItems;
    }

    // Moving to top-level between items
    const sourceGroupIndex = newItems.findIndex(
      (item, idx) =>
        item.type === 'group' && generateItemId(item, idx) === activeParentId,
    );

    if (sourceGroupIndex !== -1) {
      const sourceGroup = newItems[sourceGroupIndex];
      if (sourceGroup.type === 'group') {
        const activeIndexInGroup = sourceGroup.data.items.findIndex(
          (_, idx) =>
            generateItemId(sourceGroup.data.items[idx], idx, activeParentId) ===
            activeId,
        );

        if (activeIndexInGroup !== -1) {
          const [movedItem] = sourceGroup.data.items.splice(
            activeIndexInGroup,
            1,
          );

          // Find insertion point at top level
          const overIndex = newItems.findIndex(
            (_, idx) => generateItemId(newItems[idx], idx) === overId,
          );

          if (overIndex !== -1) {
            newItems.splice(overIndex, 0, movedItem);
          } else {
            newItems.push(movedItem);
          }
        }
      }
    }
    return newItems;
  }

  // Case 4: Moving between different groups
  if (
    activeParentId !== null &&
    overParentId !== null &&
    activeParentId !== overParentId
  ) {
    const sourceGroupIndex = newItems.findIndex(
      (item, idx) =>
        item.type === 'group' && generateItemId(item, idx) === activeParentId,
    );
    const targetGroupIndex = newItems.findIndex(
      (item, idx) =>
        item.type === 'group' && generateItemId(item, idx) === overParentId,
    );

    if (sourceGroupIndex !== -1 && targetGroupIndex !== -1) {
      const sourceGroup = newItems[sourceGroupIndex];
      const targetGroup = newItems[targetGroupIndex];

      if (sourceGroup.type === 'group' && targetGroup.type === 'group') {
        const activeIndexInGroup = sourceGroup.data.items.findIndex(
          (_, idx) =>
            generateItemId(sourceGroup.data.items[idx], idx, activeParentId) ===
            activeId,
        );

        if (activeIndexInGroup !== -1) {
          const [movedItem] = sourceGroup.data.items.splice(
            activeIndexInGroup,
            1,
          );

          const overIndexInGroup = targetGroup.data.items.findIndex(
            (_, idx) =>
              generateItemId(targetGroup.data.items[idx], idx, overParentId) ===
              overId,
          );

          if (overIndexInGroup !== -1) {
            targetGroup.data.items.splice(overIndexInGroup, 0, movedItem);
          } else {
            targetGroup.data.items.push(movedItem);
          }
        }
      }
    }
  }

  return newItems;
}

/**
 * Creates a custom collision detection function that filters out nested items
 * when dragging a group, ensuring groups can only be dropped on other groups
 * or top-level templates. Also handles items dragged from groups to top level.
 */
export function createGroupCollisionDetection(
  flatItems: FlatItem[],
): CollisionDetection {
  return (args) => {
    // Use pointerWithin for droppable zones, closestCenter for sortable items
    const pointerCollisions = pointerWithin(args);
    const centerCollisions = closestCenter(args);

    const activeId = args.active.id as string;
    const activeItem = findFlatItemById(flatItems, activeId);

    if (!activeItem) {
      return centerCollisions;
    }

    // Check if pointer is within a group droppable zone (not top-level, since that's always true)
    const groupDroppableCollision = pointerCollisions.find(
      (c) => isDroppableGroupId(c.id as string)
    );

    // Check if pointer is within top-level droppable
    const topLevelDroppableCollision = pointerCollisions.find(
      (c) => isTopLevelDroppable(c.id as string)
    );


    // When dragging a group, filter collisions to only include top-level items
    if (activeItem.item.type === 'group') {
      return centerCollisions.filter((collision) => {
        const collisionId = collision.id as string;
        const collisionItem = findFlatItemById(flatItems, collisionId);

        // Allow top-level droppable
        if (isTopLevelDroppable(collisionId)) {
          return true;
        }

        // If item not found in flatItems (e.g., droppable areas), filter it out
        if (!collisionItem) {
          return false;
        }

        // Only allow collisions with top-level items (parentId === null)
        return collisionItem.parentId === null;
      });
    }

    // When dragging an item FROM a group
    if (activeItem.parentId !== null) {
      // If pointer is specifically over a different group's droppable, prioritize that
      if (groupDroppableCollision) {
        const targetGroupId = getGroupIdFromDroppable(groupDroppableCollision.id as string);
        if (targetGroupId !== activeItem.parentId) {
          return [groupDroppableCollision, ...centerCollisions.filter((c) => c.id !== groupDroppableCollision.id)];
        }
      }

      // Check if pointer is completely outside ALL group droppables (including our own)
      // This means we're in the top-level area, not inside any group
      const isOutsideAllGroups = !groupDroppableCollision;

      // If we're truly outside all groups, prioritize top-level droppable
      if (isOutsideAllGroups && topLevelDroppableCollision) {
        // Return top-level first, then top-level items for positioning
        const topLevelItems = centerCollisions.filter((c) => {
          const id = c.id as string;
          if (isTopLevelDroppable(id)) return false; // Already added first
          if (isDroppableGroupId(id)) return true; // Allow other group droppables
          const item = findFlatItemById(flatItems, id);
          return item?.parentId === null; // Only top-level items
        });
        return [topLevelDroppableCollision, ...topLevelItems];
      }

      // Filter to allow reordering within same group + moving to top-level/other groups
      const filtered = centerCollisions.filter((collision) => {
        const collisionId = collision.id as string;

        // Always allow top-level droppable
        if (isTopLevelDroppable(collisionId)) {
          return true;
        }

        // Allow group droppables (for moving to other groups)
        if (isDroppableGroupId(collisionId)) {
          return true;
        }

        const collisionItem = findFlatItemById(flatItems, collisionId);

        if (!collisionItem) {
          return false;
        }

        // Allow collisions with top-level items
        if (collisionItem.parentId === null) {
          return true;
        }

        // Allow collisions within the same group (for reordering within group)
        if (collisionItem.parentId === activeItem.parentId) {
          return true;
        }

        return false;
      });

      // If no sortable items found and top-level droppable is available, use it
      if (filtered.length === 0 && topLevelDroppableCollision) {
        return [topLevelDroppableCollision];
      }

      return filtered;
    }

    // When dragging a top-level item (non-group)
    if (activeItem.parentId === null) {
      // If pointer is specifically over a group droppable, prioritize that
      if (groupDroppableCollision) {
        return [groupDroppableCollision, ...centerCollisions.filter((c) => c.id !== groupDroppableCollision.id)];
      }

      // Otherwise, use closestCenter for reordering
      return centerCollisions.filter((collision) => {
        const collisionId = collision.id as string;

        // Allow top-level droppable
        if (isTopLevelDroppable(collisionId)) {
          return true;
        }

        // Allow group droppables (for moving into groups)
        if (isDroppableGroupId(collisionId)) {
          return true;
        }

        const collisionItem = findFlatItemById(flatItems, collisionId);

        if (!collisionItem) {
          return false;
        }

        // Allow collisions with top-level items for reordering
        if (collisionItem.parentId === null) {
          return true;
        }

        return false;
      });
    }

    // Default: return all collisions
    return centerCollisions;
  };
}
