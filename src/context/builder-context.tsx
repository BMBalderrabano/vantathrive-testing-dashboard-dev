'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import type { SelectedItem } from '@/app/program/[id]/template-config/types';
import type { ProgramAssignmentWithTemplate } from '@/lib/supabase/schemas/program-assignments';

interface BuilderContextValue {
  selectedAssignmentId: string | null;
  setSelectedAssignmentId: (id: string | null) => void;
  clearSelectedTemplate: () => void;
  schedule: SelectedItem[][][]; // [week][day][items]
  currentWeek: number;
  programAssignmentId: string | null;
  programStartDate: string | null;
  setProgramStartDate: (date: string | null) => void;
  resetProgramAssignmentId: () => void;
  setScheduleItem: (week: number, day: number, items: SelectedItem[]) => void;
  setCurrentWeek: (week: number) => void;
  getDayItems: (week: number, day: number) => SelectedItem[];
  hasChanges: (week: number, day: number) => boolean;
  initializeSchedule: (weeks: number) => void;
  reorderWeeks: (newOrder: number[]) => void;
  copiedWeekIndex: number | null;
  copiedWeekData: SelectedItem[][] | null;
  copyWeek: (weekIndex: number) => void;
  pasteWeek: (targetWeekIndex: number) => void;
  copiedDayIndex: { week: number; day: number } | null;
  copiedDayData: SelectedItem[] | null;
  copyDay: (weekIndex: number, dayIndex: number) => void;
  pasteDay: (targetWeekIndex: number, targetDayIndex: number) => void;
}

const BuilderContext = createContext<BuilderContextValue | null>(null);

const SCHEDULE_STORAGE_KEY = 'builder-schedule';
const CURRENT_WEEK_STORAGE_KEY = 'builder-current-week';

export function useBuilder() {
  const context = useContext(BuilderContext);
  if (!context) {
    throw new Error('useBuilder must be used within BuilderContextProvider');
  }
  return context;
}

interface BuilderContextProviderProps {
  children: React.ReactNode;
  initialAssignment?: ProgramAssignmentWithTemplate | null;
  initialSchedule?: SelectedItem[][][] | null;
}

export function BuilderContextProvider({
  children,
  initialAssignment,
  initialSchedule,
}: BuilderContextProviderProps) {
  const [selectedAssignmentId, setSelectedAssignmentIdState] = useState<
    string | null
  >(null);

  const [schedule, setScheduleState] = useState<SelectedItem[][][]>(() => {
    if (initialSchedule) {
      return initialSchedule;
    }
    
    return [];
  });

  const [currentWeek, setCurrentWeekState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(CURRENT_WEEK_STORAGE_KEY);
      if (stored) {
        const week = parseInt(stored, 10);
        return isNaN(week) ? 0 : week;
      }
    }
    return 0;
  });

  const [programStartDate, setProgramStartDateState] = useState<string | null>(
    () => {
      return initialAssignment?.status === 'template'
        ? null
        : (initialAssignment?.start_date ?? null);
    },
  );

  const [copiedWeekIndex, setCopiedWeekIndex] = useState<number | null>(null);
  const [copiedWeekData, setCopiedWeekData] = useState<SelectedItem[][] | null>(
    null,
  );
  const [copiedDayIndex, setCopiedDayIndex] = useState<{
    week: number;
    day: number;
  } | null>(null);
  const [copiedDayData, setCopiedDayData] = useState<SelectedItem[] | null>(
    null,
  );

  const programAssignmentId = initialAssignment?.id ?? selectedAssignmentId;

  // Sync server-provided schedule to sessionStorage (for edits)
  useEffect(() => {
    if (initialSchedule && typeof window !== 'undefined') {
      sessionStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(initialSchedule));
    }
  }, [initialSchedule]);

  const setSelectedAssignmentId = useCallback((id: string | null) => {
    setSelectedAssignmentIdState(id);
    if (typeof window !== 'undefined' && !id) {
      sessionStorage.removeItem(SCHEDULE_STORAGE_KEY);
      sessionStorage.removeItem(CURRENT_WEEK_STORAGE_KEY);
      setScheduleState([]);
      setCurrentWeekState(0);
      setProgramStartDateState(null);
      setCopiedWeekIndex(null);
      setCopiedWeekData(null);
    }
  }, []);

  const clearSelectedTemplate = useCallback(() => {
    setSelectedAssignmentId(null);
  }, [setSelectedAssignmentId]);

  const initializeSchedule = useCallback((weeks: number) => {
    if (weeks <= 0) return;

    const newSchedule: SelectedItem[][][] = Array.from({ length: weeks }, () =>
      Array.from({ length: 7 }, () => []),
    );

    setScheduleState(newSchedule);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(newSchedule));
    }
  }, []);

  const setScheduleItem = useCallback(
    (week: number, day: number, items: SelectedItem[]) => {
      setScheduleState((prev) => {
        // Ensure schedule has enough weeks
        const updated = [...prev];
        while (updated.length <= week) {
          updated.push(Array.from({ length: 7 }, () => []));
        }

        // Ensure week has enough days
        while (updated[week].length <= day) {
          updated[week].push([]);
        }

        // Update the specific day
        updated[week] = [...updated[week]];
        updated[week][day] = items;

        // Persist to sessionStorage
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(updated));
        }

        return updated;
      });
    },
    [],
  );

  const getDayItems = useCallback(
    (week: number, day: number): SelectedItem[] => {
      if (week < 0 || day < 0 || day >= 7) return [];
      if (week >= schedule.length) return [];
      if (day >= schedule[week].length) return [];
      return schedule[week][day] || [];
    },
    [schedule],
  );

  const hasChanges = useCallback(
    (week: number, day: number): boolean => {
      const currentItems = getDayItems(week, day);
      return currentItems.length > 0;
    },
    [getDayItems],
  );

  const setCurrentWeek = useCallback((week: number) => {
    setCurrentWeekState(week);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(CURRENT_WEEK_STORAGE_KEY, week.toString());
    }
  }, []);

  const setProgramStartDate = useCallback((date: string | null) => {
    setProgramStartDateState(date);
  }, []);

  const resetProgramAssignmentId = useCallback(() => {
    setSelectedAssignmentIdState(null);
  }, []);

  const reorderWeeks = useCallback((newOrder: number[]) => {
    // Use functional update to get current state and calculate new values
    setScheduleState((prev) => {
      if (newOrder.length !== prev.length) {
        return prev;
      }

      // Create new schedule array with weeks in the new order
      const reorderedSchedule: SelectedItem[][][] = newOrder.map(
        (oldIndex) => prev[oldIndex],
      );

      // Persist schedule to sessionStorage
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(
          SCHEDULE_STORAGE_KEY,
          JSON.stringify(reorderedSchedule),
        );
      }

      return reorderedSchedule;
    });
  }, []);

  const copyWeek = useCallback(
    (weekIndex: number) => {
      if (weekIndex < 0 || weekIndex >= schedule.length) return;

      const weekData = schedule[weekIndex];
      if (weekData) {
        // Deep copy the week data
        const copiedData: SelectedItem[][] = weekData.map((day) =>
          day.map((item) => ({ ...item })),
        );
        setCopiedWeekIndex(weekIndex);
        setCopiedWeekData(copiedData);
      }
    },
    [schedule],
  );

  const pasteWeek = useCallback(
    (targetWeekIndex: number) => {
      if (
        !copiedWeekData ||
        targetWeekIndex < 0 ||
        copiedWeekIndex === targetWeekIndex
      ) {
        return;
      }

      setScheduleState((prev) => {
        const updated = [...prev];
        // Ensure schedule has enough weeks
        while (updated.length <= targetWeekIndex) {
          updated.push(Array.from({ length: 7 }, () => []));
        }

        // Deep copy the week data to the target week
        updated[targetWeekIndex] = copiedWeekData.map((day) =>
          day.map((item) => ({ ...item })),
        );

        // Persist to sessionStorage
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(updated));
        }

        return updated;
      });
    },
    [copiedWeekData, copiedWeekIndex],
  );

  const copyDay = useCallback(
    (weekIndex: number, dayIndex: number) => {
      if (
        weekIndex < 0 ||
        weekIndex >= schedule.length ||
        dayIndex < 0 ||
        dayIndex >= 7
      )
        return;

      const dayData = schedule[weekIndex]?.[dayIndex];
      if (dayData) {
        // Deep copy the day data
        const copiedData: SelectedItem[] = dayData.map((item) => ({ ...item }));
        setCopiedDayIndex({ week: weekIndex, day: dayIndex });
        setCopiedDayData(copiedData);
      }
    },
    [schedule],
  );

  const pasteDay = useCallback(
    (targetWeekIndex: number, targetDayIndex: number) => {
      if (
        !copiedDayData ||
        targetWeekIndex < 0 ||
        targetDayIndex < 0 ||
        targetDayIndex >= 7 ||
        (copiedDayIndex?.week === targetWeekIndex &&
          copiedDayIndex?.day === targetDayIndex)
      ) {
        return;
      }

      setScheduleState((prev) => {
        const updated = [...prev];
        // Ensure schedule has enough weeks
        while (updated.length <= targetWeekIndex) {
          updated.push(Array.from({ length: 7 }, () => []));
        }
        // Ensure each week has all 7 days
        for (let w = 0; w < updated.length; w++) {
          while (updated[w].length < 7) {
            updated[w].push([]);
          }
        }

        // Deep copy the day data to the target day
        updated[targetWeekIndex] = [...updated[targetWeekIndex]];
        updated[targetWeekIndex][targetDayIndex] = copiedDayData.map(
          (item) => ({ ...item }),
        );

        // Persist to sessionStorage
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(updated));
        }

        return updated;
      });
    },
    [copiedDayData, copiedDayIndex],
  );

  return (
    <BuilderContext.Provider
      value={{
        selectedAssignmentId,
        setSelectedAssignmentId,
        clearSelectedTemplate,
        schedule,
        currentWeek,
        programAssignmentId,
        programStartDate,
        setProgramStartDate,
        resetProgramAssignmentId,
        setScheduleItem,
        setCurrentWeek,
        getDayItems,
        hasChanges,
        initializeSchedule,
        reorderWeeks,
        copiedWeekIndex,
        copiedWeekData,
        copyWeek,
        pasteWeek,
        copiedDayIndex,
        copiedDayData,
        copyDay,
        pasteDay,
      }}
    >
      {children}
    </BuilderContext.Provider>
  );
}
