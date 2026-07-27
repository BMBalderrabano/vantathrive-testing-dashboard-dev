'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useExercisesInfinite,
  useExerciseTemplatesInfinite,
  useExerciseTemplatesByIds,
  useGroupsInfinite,
  useExerciseTypes,
} from '@/hooks/use-exercises';
import { useDebounce } from '@/hooks/use-debounce';
import { format } from 'date-fns';
import type { Exercise } from '@/lib/supabase/schemas/exercises';
import type { ExerciseTemplate } from '@/lib/supabase/schemas/exercise-templates';
import type { SelectedItem } from '@/app/program/[id]/template-config/types';
import type { Group as DbGroup } from '@/lib/supabase/queries/groups';
import {
  ExerciseTabSwitcher,
  type TabType,
} from './partials/exercise-tab-switcher';
import { ExerciseSearchControls } from './partials/exercise-search-controls';
import { ExerciseLibraryCard } from './partials/exercise-library-card';
import { ExerciseTemplateCard } from './partials/exercise-template-card';
import { GroupCard } from './partials/group-card';
import { SelectedItemsList } from './selected-items-list';
import { DefaultValues } from '../default-values/default-values';

interface ExerciseBuilderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: (selectedItems: SelectedItem[]) => void;
  onCancel?: () => void;
  initialItems?: SelectedItem[];
  onItemsChange?: (selectedItems: SelectedItem[]) => void;
  weekIndex?: number;
  dayIndex?: number;
  date?: Date | null;
}

export function ExerciseBuilderModal({
  open,
  onOpenChange,
  onDone,
  onCancel,
  initialItems = [],
  onItemsChange,
  weekIndex,
  dayIndex,
  date,
}: ExerciseBuilderModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('library');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] =
    useState<SelectedItem[]>(initialItems);
  const [showGroupInput, setShowGroupInput] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');

  const debouncedSearch = useDebounce(search, 300);
  const observerTargetRef = useRef<HTMLDivElement>(null);

  const { data: typeOptions = [] } = useExerciseTypes();
  const exercisesQuery = useExercisesInfinite(
    debouncedSearch || undefined,
    sortBy,
    sortOrder,
    20,
    sourceFilter ?? undefined,
  );

  const templatesQuery = useExerciseTemplatesInfinite(
    debouncedSearch || undefined,
    sortBy,
    sortOrder,
    20,
  );

  const groupsQuery = useGroupsInfinite(
    debouncedSearch || undefined,
    sortBy,
    sortOrder,
    20,
  );

  const currentQuery =
    activeTab === 'library'
      ? exercisesQuery
      : activeTab === 'templates'
        ? templatesQuery
        : activeTab === 'groups'
          ? groupsQuery
          : null;

  // Infinite scroll observer
  useEffect(() => {
    if (!currentQuery || activeTab === 'default-values') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          currentQuery.hasNextPage &&
          !currentQuery.isFetchingNextPage
        ) {
          currentQuery.fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    const currentTarget = observerTargetRef.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [
    currentQuery?.hasNextPage,
    currentQuery?.isFetchingNextPage,
    currentQuery?.fetchNextPage,
    currentQuery,
    activeTab,
  ]);

  const updateSelectedItems = (newItems: SelectedItem[]) => {
    setSelectedItems(newItems);
    onItemsChange?.(newItems);
  };

  const handleAddExercise = (exercise: Exercise) => {
    updateSelectedItems([
      ...selectedItems,
      { type: 'exercise', data: exercise },
    ]);
  };

  const handleAddTemplate = (template: ExerciseTemplate) => {
    updateSelectedItems([
      ...selectedItems,
      { type: 'template', data: template },
    ]);
  };

  const allExercises = exercisesQuery.data?.pages.flat() || [];
  const allTemplates = templatesQuery.data?.pages.flat() || [];
  const allGroups = useMemo(
    () => groupsQuery.data?.pages.flat() || [],
    [groupsQuery.data],
  );

  const groupTemplateIds = useMemo(() => {
    if (activeTab !== 'groups') return [];
    const ids = new Set<string>();
    for (const group of allGroups) {
      for (const id of group.exercise_template_ids ?? []) {
        ids.add(id);
      }
    }
    return Array.from(ids);
  }, [activeTab, allGroups]);

  const groupTemplatesQuery = useExerciseTemplatesByIds(groupTemplateIds);
  const groupTemplatesById = useMemo(() => {
    const map: Record<string, ExerciseTemplate | undefined> = {};
    for (const t of groupTemplatesQuery.data ?? []) {
      map[t.id] = t;
    }
    return map;
  }, [groupTemplatesQuery.data]);

  const handleAddDatabaseGroup = (group: DbGroup) => {
    const items: SelectedItem[] = (group.exercise_template_ids ?? [])
      .map((id) => groupTemplatesById[id])
      .filter(Boolean)
      .map((template) => ({
        type: 'template' as const,
        data: template as ExerciseTemplate,
      }));

    const newGroup: SelectedItem = {
      type: 'group',
      data: {
        id: group.id,
        name: group.title,
        isSuperset: group.is_superset ?? false,
        items,
      },
    };

    updateSelectedItems([...selectedItems, newGroup]);
  };

  const handleRemoveItem = (index: number) => {
    updateSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, item: SelectedItem) => {
    const updated = [...selectedItems];
    updated[index] = item;
    updateSelectedItems(updated);
  };

  const handleDone = () => {
    // Filter out empty groups before saving
    const filteredItems = selectedItems.filter((item) => {
      if (item.type === 'group') {
        return item.data.items.length > 0;
      }
      return true;
    });
    
    onDone?.(filteredItems);
    onOpenChange(false);
    setSearch('');
    setShowGroupInput(false);
    setGroupNameInput('');
  };

  const handleCancel = () => {
    onCancel?.();
    setSearch('');
    setShowGroupInput(false);
    setGroupNameInput('');
  };

  const handleSortChange = (by: string, order: 'asc' | 'desc') => {
    setSortBy(by);
    setSortOrder(order);
  };

  const handleAddGroup = () => {
    if (groupNameInput.trim()) {
      const newGroup: SelectedItem = {
        type: 'group',
        data: {
          name: groupNameInput.trim(),
          isSuperset: false,
          items: [],
        },
      };
      updateSelectedItems([...selectedItems, newGroup]);
      setGroupNameInput('');
      setShowGroupInput(false);
    }
  };

  const handleRemoveGroup = (index: number) => {
    updateSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const handleToggleSuperset = (index: number) => {
    const updated = [...selectedItems];
    const item = updated[index];
    if (item && item.type === 'group') {
      updated[index] = {
        ...item,
        data: {
          ...item.data,
          isSuperset: !item.data.isSuperset,
        },
      };
      updateSelectedItems(updated);
    }
  };

  const handleCancelGroupInput = () => {
    setGroupNameInput('');
    setShowGroupInput(false);
  };

  // Format header title with week, day, and date
  const getHeaderTitle = () => {
    if (
      weekIndex !== undefined &&
      dayIndex !== undefined &&
      date !== null &&
      date !== undefined
    ) {
      const formattedDate = format(date, 'MM-dd-yyyy');
      return `Add Exercises or Groups - Week ${weekIndex + 1}, Day ${dayIndex + 1} (${formattedDate})`;
    }
    return 'Add Exercises or Groups';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] h-[90vh] max-w-[90vw] flex flex-col p-0">
        <div className="flex flex-col flex-1 min-h-0">
        <DialogHeader className="p-6">
          <DialogTitle>{getHeaderTitle()}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel */}
          <div className="w-2/3 border-r px-6 flex flex-col overflow-hidden">
            {/* Tabs and Controls */}
            <ExerciseTabSwitcher
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
            {activeTab !== 'default-values' && (
              <ExerciseSearchControls
                search={search}
                onSearchChange={setSearch}
                sortBy={sortBy}
                onSortChange={handleSortChange}
                sourceFilter={sourceFilter}
                onSourceFilterChange={setSourceFilter}
                typeOptions={typeOptions}
              />
            )}

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'default-values' ? (
                  <DefaultValues />
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {activeTab === 'library' ? (
                  <>
                    {allExercises.map((exercise, index) => (
                      <ExerciseLibraryCard
                        key={`exercise-${exercise.id}-${index}`}
                        exercise={exercise}
                        onAdd={() => handleAddExercise(exercise)}
                        index={index}
                      />
                    ))}
                    {(exercisesQuery.isLoading && (
                      <div className="col-span-full text-center py-4 text-muted-foreground">
                        Loading...
                      </div>
                    )) ||
                      (!exercisesQuery.hasNextPage &&
                        allExercises.length === 0 && (
                          <div className="col-span-full text-center py-4 text-muted-foreground">
                            No exercises found
                          </div>
                        ))}
                    {exercisesQuery.isError && (
                      <div className="col-span-full text-center py-4 text-red-500">
                        Error loading exercises
                      </div>
                    )}
                  </>
                ) : activeTab === 'templates' ? (
                  <>
                    {allTemplates.map((template, index) => (
                      <ExerciseTemplateCard
                        key={`template-${template.id}-${index}`}
                        template={template}
                        onAdd={() => handleAddTemplate(template)}
                        index={index}
                      />
                    ))}
                    {(templatesQuery.isLoading && (
                      <div className="col-span-full text-center py-4 text-muted-foreground">
                        Loading...
                      </div>
                    )) ||
                      (!templatesQuery.hasNextPage &&
                        allTemplates.length === 0 && (
                          <div className="col-span-full text-center py-4 text-muted-foreground">
                            No templates found
                          </div>
                        ))}
                    {templatesQuery.isError && (
                      <div className="col-span-full text-center py-4 text-red-500">
                        Error loading templates
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {allGroups.map((group, index) => (
                      <GroupCard
                        key={`group-${group.id}-${index}`}
                        group={group}
                        templatesById={groupTemplatesById}
                        onAdd={() => handleAddDatabaseGroup(group)}
                        index={index}
                      />
                    ))}

                    {(groupsQuery.isLoading && (
                      <div className="col-span-full text-center py-4 text-muted-foreground">
                        Loading...
                      </div>
                    )) ||
                      (!groupsQuery.hasNextPage && allGroups.length === 0 && (
                        <div className="col-span-full text-center py-4 text-muted-foreground">
                          No groups found
                        </div>
                      ))}

                    {groupsQuery.isError && (
                      <div className="col-span-full text-center py-4 text-red-500">
                        Error loading groups
                      </div>
                    )}
                  </>
                  )}
                </div>
              )}

              {/* Infinite scroll trigger */}
              {activeTab !== 'default-values' && (
                <>
                  <div ref={observerTargetRef} className="h-4" />
                  {currentQuery && currentQuery.hasNextPage && !currentQuery.isFetchingNextPage && (
                    <div className="mt-4 flex justify-center">
                      <Button
                        onClick={() => currentQuery.fetchNextPage()}
                        disabled={currentQuery.isFetchingNextPage}
                        size="sm"
                      >
                        Load More
                      </Button>
                    </div>
                  )}
                  {currentQuery && currentQuery.isFetchingNextPage && (
                    <div className="mt-4 flex justify-center">
                      <div className="text-muted-foreground">Loading more...</div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right Panel - Selected Items */}
          <div className="w-1/3 flex flex-col overflow-y-auto px-6 slim-scrollbar">
            <h4 className="font-semibold mb-4">Selected Items</h4>
            {!showGroupInput ? (
              <button
                onClick={() => setShowGroupInput(true)}
                className="cursor-pointer mb-4 w-full px-4 py-3 border-2 border-dashed border-border rounded-md text-sm font-medium text-muted-foreground hover:border-primary/50 hover:bg-muted/60 hover:text-foreground transition-colors"
              >
                + Add Group
              </button>
            ) : (
              <div className="flex items-center gap-2 mb-4">
                <Input
                  type="text"
                  value={groupNameInput}
                  onChange={(e) => setGroupNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddGroup();
                    } else if (e.key === 'Escape') {
                      handleCancelGroupInput();
                    }
                  }}
                  placeholder="Group name..."
                  className="flex-1"
                  autoFocus
                />
                <Button
                  onClick={handleAddGroup}
                  size="icon-sm"
                  className="cursor-pointer shadow-(--shadow-sm)"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleCancelGroupInput}
                  variant="secondary"
                  size="icon-sm"
                  className="cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <SelectedItemsList
              items={selectedItems}
              onRemove={handleRemoveItem}
              onUpdate={handleUpdateItem}
              onItemsReorder={updateSelectedItems}
              onRemoveGroup={handleRemoveGroup}
              onToggleSuperset={handleToggleSuperset}
            />
          </div>
        </div>

        <DialogFooter className="p-4">
          <Button onClick={handleCancel} variant="outline">
            Cancel
          </Button>
          <Button onClick={handleDone}>
            Done
          </Button>
        </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
