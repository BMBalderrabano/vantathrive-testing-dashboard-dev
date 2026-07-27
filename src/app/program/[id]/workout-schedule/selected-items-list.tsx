'use client';

import { useState, useCallback } from 'react';
import type { ExerciseTemplate } from '@/lib/supabase/schemas/exercise-templates';
import { TemplateConfigOffsets } from '../template-config/template-config';
import type { SelectedItem } from '../template-config/types';
import { DragContextProvider } from './dnd/drag-context';
import { DragContent } from './dnd/drag-content';

interface SelectedItemsListProps {
  items: SelectedItem[];
  onRemove: (index: number) => void;
  onUpdate: (index: number, item: SelectedItem) => void;
  onItemsReorder: (items: SelectedItem[]) => void;
  onRemoveGroup?: (index: number) => void;
  onToggleSuperset?: (index: number) => void;
}

export function SelectedItemsList({
  items,
  onRemove,
  onUpdate,
  onItemsReorder,
  onRemoveGroup,
  onToggleSuperset,
}: SelectedItemsListProps) {
  const [modalState, setModalState] = useState<{
    open: boolean;
    position: { x: number; y: number };
    item: Exclude<SelectedItem, { type: 'group' }> | null;
    itemIndex: number | null;
    groupIndex?: number | null;
    groupItemIndex?: number | null;
  }>({
    open: false,
    position: { x: 0, y: 0 },
    item: null,
    itemIndex: null,
    groupIndex: null,
    groupItemIndex: null,
  });

  const [copiedTemplateData, setCopiedTemplateData] =
    useState<Partial<ExerciseTemplate> | null>(null);

  const handleItemClick = useCallback(
    (index: number, event: React.MouseEvent) => {
      const item = items[index];
      if (!item || item.type === 'group') return;

      setModalState({
        open: true,
        position: {
          x: event.clientX - TemplateConfigOffsets.x,
          y: event.clientY - TemplateConfigOffsets.y,
        },
        item,
        itemIndex: index,
      });
    },
    [items],
  );

  const handleCloseModal = useCallback(() => {
    setModalState({
      open: false,
      position: { x: 0, y: 0 },
      item: null,
      itemIndex: null,
      groupIndex: null,
      groupItemIndex: null,
    });
  }, []);

  const handleCopy = useCallback((data: Partial<ExerciseTemplate>) => {
    setCopiedTemplateData(data);
  }, []);

  return (
    <DragContextProvider items={items} onItemsReorder={onItemsReorder}>
      <DragContent
        items={items}
        onRemove={onRemove}
        onRemoveGroup={onRemoveGroup}
        onToggleSuperset={onToggleSuperset}
        modalState={modalState}
        setModalState={setModalState}
        copiedTemplateData={copiedTemplateData}
        handleCloseModal={handleCloseModal}
        onUpdate={onUpdate}
        handleCopy={handleCopy}
        handleItemClick={handleItemClick}
      />
    </DragContextProvider>
  );
}
