'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { ExerciseBuilderModal } from './exercise-builder-modal';
import type { SelectedItem } from '@/app/program/[id]/template-config/types';
import { useBuilder } from '@/context/builder-context';
import {
  upsertWorkoutSchedule,
  updateProgramSchedule,
  upsertGroup,
  upsertExerciseTemplate,
} from '@/app/program/actions';
import { convertSelectedItemsToDatabaseSchedule } from './utils';
import toast from 'react-hot-toast';
import { DayBox } from './day-box';
import { useDefaultValues } from '../default-values/use-default-values';

export function DayBoxesGrid() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [pendingItems, setPendingItems] = useState<SelectedItem[]>([]);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [animatingDay, setAnimatingDay] = useState<{
    weekIndex: number;
    dayIndex: number;
  } | null>(null);
  const dayAnimationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const {
    currentWeek,
    programAssignmentId,
    programStartDate,
    resetProgramAssignmentId,
    setScheduleItem,
    getDayItems,
    schedule,
    copiedDayIndex,
    copiedDayData,
    copyDay,
    pasteDay,
  } = useBuilder();

  const { values: defaultValues } = useDefaultValues();

  const previousWeekDayRef = useRef<{ week: number; day: number } | null>(null);
  const initialItemsRef = useRef<SelectedItem[] | null>(null);

  // Parse date string to local date (avoiding timezone issues)
  const parseLocalDate = useCallback((dateString: string): Date => {
    // Parse YYYY-MM-DD format to local date
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }, []);

  // Days always show Monday-Sunday (1-7)
  const days = Array.from({ length: 7 }, (_, i) => i + 1);

  // Get the Monday of the week containing the start date
  const getWeekStartMonday = useCallback((): Date | null => {
    if (!programStartDate) return null;
    const start = parseLocalDate(programStartDate);
    // getDay() returns 0=Sunday, 1=Monday, ..., 6=Saturday
    // Convert to 0=Monday, 1=Tuesday, ..., 6=Sunday
    const dayOfWeek = start.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(start);
    monday.setDate(monday.getDate() - mondayOffset);
    return monday;
  }, [programStartDate, parseLocalDate]);

  // Calculate the actual date for a specific week and day (Monday=0, Tuesday=1, ..., Sunday=6)
  const calculateDayDate = useCallback(
    (weekIndex: number, dayOfWeek: number): Date | null => {
      // dayOfWeek: 1=Monday, 2=Tuesday, ..., 7=Sunday
      // Convert to 0=Monday, 1=Tuesday, ..., 6=Sunday
      const dayIndex = dayOfWeek - 1;
      const weekStartMonday = getWeekStartMonday();
      if (!weekStartMonday) return null;
      const dayDate = new Date(weekStartMonday);
      dayDate.setDate(dayDate.getDate() + weekIndex * 7 + dayIndex);
      return dayDate;
    },
    [getWeekStartMonday],
  );

  // Check if a day is before start_date
  const isDayBeforeStart = useCallback(
    (weekIndex: number, dayOfWeek: number): boolean => {
      if (!programStartDate) return false;

      const start = parseLocalDate(programStartDate);
      start.setHours(0, 0, 0, 0);

      const dayDate = calculateDayDate(weekIndex, dayOfWeek);
      if (!dayDate) return false;
      dayDate.setHours(0, 0, 0, 0);

      return dayDate.getTime() < start.getTime();
    },
    [programStartDate, parseLocalDate, calculateDayDate],
  );

  // Calculate date for currently selected day
  const selectedDayDate = useMemo(() => {
    if (selectedDay === null) return null;
    return calculateDayDate(currentWeek, selectedDay);
  }, [currentWeek, selectedDay, calculateDayDate]);

  const handleAddExercise = (day: number) => {
    // day is 1-7 (Monday-Sunday), convert to 0-6 for storage
    const dayIndex = day - 1;

    // Check if weekday changed (different week or day) and reset program assignment ID
    const previous = previousWeekDayRef.current;
    if (
      previous !== null &&
      (previous.week !== currentWeek || previous.day !== dayIndex)
    ) {
      resetProgramAssignmentId();
    }

    setSelectedDay(day);
    previousWeekDayRef.current = { week: currentWeek, day: dayIndex };
    // Load existing items for this day
    const initialItems = getDayItems(currentWeek, dayIndex);

    // Store initial items (deep copy to prevent mutation)
    initialItemsRef.current = JSON.parse(JSON.stringify(initialItems));
    setPendingItems(initialItems);
    setModalOpen(true);
  };

  const saveDraft = async (
    items: SelectedItem[],
    week: number,
    day: number,
  ) => {
    if (!programAssignmentId) {
      toast.error('No program assignment found');
      return;
    }

    try {
      // Update schedule in context first
      setScheduleItem(week, day, items);

      // Create updated schedule array
      const updatedSchedule = [...schedule];
      if (updatedSchedule.length === 0) {
        updatedSchedule.push(Array.from({ length: 7 }, () => []));
      }
      while (updatedSchedule.length <= week) {
        updatedSchedule.push(Array.from({ length: 7 }, () => []));
      }
      // Ensure each week has all 7 days
      for (let w = 0; w < updatedSchedule.length; w++) {
        while (updatedSchedule[w].length < 7) {
          updatedSchedule[w].push([]);
        }
      }
      updatedSchedule[week] = [...updatedSchedule[week]];
      updatedSchedule[week][day] = items;

      // Convert to database format (upserts groups and exercises without IDs)
      const conversionResult = await convertSelectedItemsToDatabaseSchedule(
        updatedSchedule,
        upsertGroup,
        upsertExerciseTemplate,
        defaultValues,
      );

      if (!conversionResult.success) {
        console.error('Error converting schedule:', conversionResult.error);
        toast.error(conversionResult.error || 'Failed to convert schedule');
        return;
      }

      // Update context with IDs (from the updated schedule returned by conversion)
      // Always update the edited day, even if empty (rest day)
      setScheduleItem(week, day, conversionResult.updatedSchedule[week]?.[day] || []);
      
      // Save to database
      const result = await upsertWorkoutSchedule(conversionResult.data);

      if (!result.success) {
        console.error('Error saving workout schedule:', result.error);
        toast.error(result.error || 'Failed to save draft');
        return;
      }

      // Update program assignment workout_schedule_id
      const updateResult = await updateProgramSchedule(
        programAssignmentId,
        result.data.id,
      );

      if (!updateResult.success) {
        console.error('Error updating program assignment:', updateResult.error);
        toast.error(
          updateResult.error || 'Failed to update program assignment',
        );
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('An unexpected error occurred');
    }
  };

  const handleModalDone = async (selectedItems: SelectedItem[]) => {
    if (selectedDay === null) return;

    const dayIndex = selectedDay - 1;
    const previousItems = getDayItems(currentWeek, dayIndex);
    const hasChanges =
      JSON.stringify(previousItems) !== JSON.stringify(selectedItems);

    if (hasChanges) {
      await saveDraft(selectedItems, currentWeek, dayIndex);
    }

    setModalOpen(false);
    setSelectedDay(null);
    previousWeekDayRef.current = null;
    setPendingItems([]);
    initialItemsRef.current = null;
  };

  const handleItemsChange = (items: SelectedItem[]) => {
    setPendingItems(items);
  };

  const handleModalCancel = useCallback(() => {
    if (selectedDay === null || initialItemsRef.current === null) return;

    const dayIndex = selectedDay - 1;
    // Revert schedule state to initial items
    setScheduleItem(currentWeek, dayIndex, initialItemsRef.current);
    
    // Clear state
    setSelectedDay(null);
    previousWeekDayRef.current = null;
    setPendingItems([]);
    initialItemsRef.current = null;
    setModalOpen(false);
  }, [selectedDay, currentWeek, setScheduleItem]);

  const handleModalClose = async (open: boolean) => {
    if (!open && selectedDay !== null) {
      // Modal is closing via close button - revert instead of saving
      handleModalCancel();
    } else {
      setModalOpen(open);
    }
  };

  const dayItems = useMemo(
    () => (day: number) => {
      // day is 1-7 (Monday-Sunday), convert to 0-6 for storage
      const dayIndex = day - 1;
      return getDayItems(currentWeek, dayIndex);
    },
    [currentWeek, getDayItems],
  );

  useEffect(() => () => {
    if (dayAnimationTimeoutRef.current) clearTimeout(dayAnimationTimeoutRef.current);
  }, []);

  const triggerDayPasteAnimation = useCallback(
    (weekIndex: number, dayIndex: number) => {
      if (dayAnimationTimeoutRef.current) {
        clearTimeout(dayAnimationTimeoutRef.current);
      }
      setAnimatingDay({ weekIndex, dayIndex });
      dayAnimationTimeoutRef.current = setTimeout(() => {
        setAnimatingDay(null);
        dayAnimationTimeoutRef.current = null;
      }, 1000);
    },
    [],
  );

  const handlePasteDay = useCallback(
    (dayIndex: number) => {
      pasteDay(currentWeek, dayIndex);
      triggerDayPasteAnimation(currentWeek, dayIndex);
    },
    [currentWeek, pasteDay, triggerDayPasteAnimation],
  );

  // Keyboard listener for copy/paste shortcuts
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't intercept if user is typing in an input field
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Check for Ctrl+C or Cmd+C (Mac)
      if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
        if (hoveredDay !== null) {
          event.preventDefault();
          const dayIndex = hoveredDay - 1;
          copyDay(currentWeek, dayIndex);
        }
      }

      // Check for Ctrl+V or Cmd+V (Mac)
      if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
        if (hoveredDay !== null) {
          const dayIndex = hoveredDay - 1;
          const isPasteDisabled =
            !copiedDayData ||
            (copiedDayIndex?.week === currentWeek &&
              copiedDayIndex?.day === dayIndex);

          if (!isPasteDisabled) {
            event.preventDefault();
            handlePasteDay(dayIndex);
          }
        }
      }
    },
    [hoveredDay, currentWeek, copyDay, handlePasteDay, copiedDayData, copiedDayIndex],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const handleWheel = useCallback((e: WheelEvent) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    // Always consume wheel over grid so main page scroll (breadcrumb hide) doesn't run
    e.preventDefault();
    const canScrollLeft = el.scrollLeft > 0;
    const canScrollRight =
      el.scrollLeft < el.scrollWidth - el.clientWidth - 1;
    const delta = e.deltaY;
    if (delta > 0 && canScrollRight) el.scrollLeft += delta;
    else if (delta < 0 && canScrollLeft) el.scrollLeft += delta;
  }, []);

  const scrollContainerRefCallback = useCallback(
    (node: HTMLDivElement | null) => {
      const prev = scrollContainerRef.current;
      scrollContainerRef.current = node;
      if (prev) prev.removeEventListener('wheel', handleWheel);
      if (node) node.addEventListener('wheel', handleWheel, { passive: false });
    },
    [handleWheel],
  );

  return (
    <>
      <div
        ref={scrollContainerRefCallback}
        className="mt-6 overflow-x-auto slim-scrollbar"
      >
        <div className="flex gap-4">
          {days.map((day, index) => {
            // day is 1-7 (Monday-Sunday), convert to 0-6 for storage
            const dayIndex = day - 1;
            const items = dayItems(day);
            const dayDate = calculateDayDate(currentWeek, day);
            const formattedDate = dayDate
              ? dayDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })
              : null;

            const isBeforeStart = isDayBeforeStart(currentWeek, day);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dayStart = dayDate
              ? new Date(
                  dayDate.getFullYear(),
                  dayDate.getMonth(),
                  dayDate.getDate(),
                  0,
                  0,
                  0,
                  0,
                )
              : null;
            const isPastDate = dayStart ? dayStart.getTime() < today.getTime() : false;
            const isDayCopied =
              copiedDayIndex?.week === currentWeek &&
              copiedDayIndex?.day === dayIndex;
            const isDayPasteDisabled =
              !copiedDayData ||
              (copiedDayIndex?.week === currentWeek &&
                copiedDayIndex?.day === dayIndex);

            return (
              <DayBox
                key={day}
                day={day}
                weekIndex={currentWeek}
                items={items}
                formattedDate={formattedDate}
                isBeforeStart={isBeforeStart}
                isPastDate={isPastDate}
                isDayCopied={isDayCopied}
                isDayPasteDisabled={isDayPasteDisabled}
                isPasteAnimating={
                  animatingDay !== null &&
                  animatingDay.weekIndex === currentWeek &&
                  animatingDay.dayIndex === dayIndex
                }
                index={index}
                onAddExercise={handleAddExercise}
                onCopyDay={() => copyDay(currentWeek, dayIndex)}
                onPasteDay={() => handlePasteDay(dayIndex)}
                onMouseEnter={() => setHoveredDay(day)}
                onMouseLeave={() => setHoveredDay(null)}
                defaultValues={defaultValues}
              />
            );
          })}
        </div>
      </div>
      <ExerciseBuilderModal
        key={`modal-${currentWeek}-${selectedDay}`}
        open={modalOpen}
        onOpenChange={handleModalClose}
        onDone={handleModalDone}
        onCancel={handleModalCancel}
        initialItems={pendingItems}
        onItemsChange={handleItemsChange}
        weekIndex={selectedDay !== null ? currentWeek : undefined}
        dayIndex={selectedDay !== null ? selectedDay - 1 : undefined}
        date={selectedDayDate}
      />
    </>
  );
}
