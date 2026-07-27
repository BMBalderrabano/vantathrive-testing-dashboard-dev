'use client';

import { useEffect, RefObject } from 'react';
import { UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { startOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { useBuilder } from '@/context/builder-context';
import type { ProgramTemplate } from '@/lib/supabase/schemas/program-templates';
import type { ProgramAssignmentWithTemplate } from '@/lib/supabase/schemas/program-assignments';
import {
  formatDateForDB,
  calculateEndDate,
  parseLocalDateString,
} from '@/lib/utils';
import type { ProgramTemplateFormData } from '@/app/program/program/schemas';
import { isPreProgramTemplateStatus } from '@/lib/constants/program-assignment-status';

interface UseProgramFormDatesProps {
  initialData?: ProgramTemplate | null;
  initialAssignment?: ProgramAssignmentWithTemplate | null;
  form: {
    watch: UseFormWatch<ProgramTemplateFormData>;
    setValue: UseFormSetValue<ProgramTemplateFormData>;
  };
  loadedDatesForTemplateIdRef: RefObject<string | null>;
}

export function useProgramFormDates({
  initialData,
  initialAssignment,
  form,
  loadedDatesForTemplateIdRef,
}: UseProgramFormDatesProps) {
  const { setProgramStartDate } = useBuilder();
  const { watch, setValue } = form;
  const weeks = watch('weeks');
  const startDate = watch('startDate');
  const endDate = watch('endDate');

  // Load dates from initialAssignment if provided (never for template assignments)
  useEffect(() => {
    if (
      !initialAssignment ||
      initialAssignment.status === 'template' ||
      isPreProgramTemplateStatus(initialAssignment.status) ||
      loadedDatesForTemplateIdRef.current === initialAssignment.id
    ) {
      return;
    }

    if (initialAssignment.start_date) {
      const normalizedStart = startOfDay(
        parseLocalDateString(initialAssignment.start_date),
      );
      const weeks = initialAssignment.program_template?.weeks || 4;
      const end = initialAssignment.end_date
        ? startOfDay(parseLocalDateString(initialAssignment.end_date))
        : calculateEndDate(normalizedStart, weeks);

      if (end) {
        const normalizedEnd = startOfDay(end);
        setValue('startDate', normalizedStart);
        setValue('endDate', normalizedEnd);
        setProgramStartDate(formatDateForDB(normalizedStart));
        loadedDatesForTemplateIdRef.current = initialAssignment.id;
      }
    }
  }, [
    initialAssignment,
    setValue,
    setProgramStartDate,
    loadedDatesForTemplateIdRef,
  ]);

  // Update end date when start date or weeks change
  useEffect(() => {
    if (startDate && weeks >= 1) {
      const normalizedStart = startOfDay(startDate);
      const calculatedEndDate = calculateEndDate(normalizedStart, weeks);
      if (calculatedEndDate) {
        const normalizedEnd = startOfDay(calculatedEndDate);
        setValue('endDate', normalizedEnd, { shouldValidate: true });
        // Store start date in builder context (only in edit mode)
        if (initialData) {
          setProgramStartDate(formatDateForDB(normalizedStart));
        }
      }
    } else if (!startDate) {
      setValue('endDate', undefined as unknown as Date, {
        shouldValidate: false,
      });
      if (initialData) {
        setProgramStartDate(null);
      }
    }
  }, [startDate, weeks, setValue, initialData, setProgramStartDate]);

  const handleDateSelect = (range: DateRange | undefined) => {
    // If clicking the same start date again, deselect
    if (
      startDate &&
      range?.from &&
      startOfDay(range.from).getTime() === startOfDay(startDate).getTime()
    ) {
      setValue('startDate', undefined as unknown as Date, {
        shouldValidate: false,
      });
      setValue('endDate', undefined as unknown as Date, {
        shouldValidate: false,
      });
      if (initialData) {
        setProgramStartDate(null);
      }
      return;
    }

    // Handle date selection
    if (range?.from) {
      const normalizedFrom = startOfDay(range.from);

      // If weeks > 0, automatically extend to show full range
      if (weeks >= 1) {
        const calculatedEndDate = calculateEndDate(normalizedFrom, weeks);
        if (calculatedEndDate) {
          const normalizedEnd = startOfDay(calculatedEndDate);
          setValue('startDate', normalizedFrom, { shouldValidate: true });
          setValue('endDate', normalizedEnd, { shouldValidate: true });
          // Store start date in builder context (only in edit mode)
          if (initialData) {
            setProgramStartDate(formatDateForDB(normalizedFrom));
          }
        }
      } else {
        // If weeks = 0 or undefined, show only single date
        setValue('startDate', normalizedFrom, { shouldValidate: true });
        setValue('endDate', undefined as unknown as Date, {
          shouldValidate: false,
        });
        if (initialData) {
          setProgramStartDate(formatDateForDB(normalizedFrom));
        }
      }
    } else {
      setValue('startDate', undefined as unknown as Date, {
        shouldValidate: false,
      });
      setValue('endDate', undefined as unknown as Date, {
        shouldValidate: false,
      });
      if (initialData) {
        setProgramStartDate(null);
      }
    }
  };

  const dateRange: DateRange | undefined =
    startDate && endDate
      ? {
          from: startDate,
          to: endDate,
        }
      : undefined;

  return {
    startDate,
    endDate,
    dateRange,
    handleDateSelect,
  };
}
