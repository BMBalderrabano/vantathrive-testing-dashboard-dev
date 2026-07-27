'use client';

import { cn } from '@/lib/utils';

export type TabType = 'library' | 'templates' | 'groups' | 'default-values';

interface ExerciseTabSwitcherProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function ExerciseTabSwitcher({
  activeTab,
  onTabChange,
}: ExerciseTabSwitcherProps) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <button
        onClick={() => onTabChange('library')}
        className={cn(
          'h-10 px-4 rounded-[var(--radius-pill)] text-sm font-medium transition-colors',
          activeTab === 'library'
            ? 'bg-primary text-primary-foreground shadow-[var(--shadow-sm)]'
            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        )}
      >
        Library
      </button>
      <button
        onClick={() => onTabChange('templates')}
        className={cn(
          'h-10 px-4 rounded-[var(--radius-pill)] text-sm font-medium transition-colors',
          activeTab === 'templates'
            ? 'bg-primary text-primary-foreground shadow-[var(--shadow-sm)]'
            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        )}
      >
        Templates
      </button>
      <button
        onClick={() => onTabChange('groups')}
        className={cn(
          'h-10 px-4 rounded-[var(--radius-pill)] text-sm font-medium transition-colors',
          activeTab === 'groups'
            ? 'bg-primary text-primary-foreground shadow-[var(--shadow-sm)]'
            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        )}
      >
        Groups
      </button>
      <button
        onClick={() => onTabChange('default-values')}
        className={cn(
          'h-10 px-4 rounded-[var(--radius-pill)] text-sm font-medium transition-colors',
          activeTab === 'default-values'
            ? 'bg-primary text-primary-foreground shadow-[var(--shadow-sm)]'
            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        )}
      >
        Default Values
      </button>
    </div>
  );
}
