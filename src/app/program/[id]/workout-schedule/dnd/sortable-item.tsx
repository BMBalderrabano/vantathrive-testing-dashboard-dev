'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SortableItemProps {
  id: string;
  children: ReactNode;
  disabled?: boolean;
}

export function SortableItem({
  id,
  children,
  disabled = false,
}: SortableItemProps): ReactNode {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative touch-none',
        isDragging && 'opacity-50 z-50 shadow-[var(--shadow-lg)] scale-[1.02]',
        isOver && !isDragging && 'ring-2 ring-ring ring-offset-2 ring-offset-background',
        !disabled && 'cursor-grab active:cursor-grabbing',
      )}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}
