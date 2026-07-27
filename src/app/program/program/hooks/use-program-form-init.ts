'use client';

import { useEffect, RefObject } from 'react';
import { UseFormReset, UseFormGetValues } from 'react-hook-form';
import type { ProgramTemplate } from '@/lib/supabase/schemas/program-templates';
import type { ProgramTemplateFormData } from '@/app/program/program/schemas';

interface UseProgramFormInitProps {
  initialData?: ProgramTemplate | null;
  reset: UseFormReset<ProgramTemplateFormData>;
  getValues: UseFormGetValues<ProgramTemplateFormData>;
  loadedDatesForTemplateIdRef: RefObject<string | null>;
}

export function useProgramFormInit({
  initialData,
  reset,
  getValues,
  loadedDatesForTemplateIdRef,
}: UseProgramFormInitProps) {
  useEffect(() => {
    if (initialData) {
      const isDifferentTemplate =
        loadedDatesForTemplateIdRef.current !== initialData.id;

      const currentValues = getValues();
      const shouldPreserveDates =
        !isDifferentTemplate &&
        (currentValues.startDate || currentValues.endDate);

      if (isDifferentTemplate) {
        loadedDatesForTemplateIdRef.current = null;
      }

      reset({
        name: initialData.name || '',
        description: initialData.description || '',
        weeks: initialData.weeks || 4,
        goals: initialData.goals || '',
        notes: initialData.notes || '',
        organizationId: initialData.organization_id ?? null,
        startDate: shouldPreserveDates
          ? currentValues.startDate
          : (undefined as unknown as Date),
        endDate: shouldPreserveDates
          ? currentValues.endDate
          : (undefined as unknown as Date),
      });
    }
  }, [initialData, reset, getValues, loadedDatesForTemplateIdRef]);
}
