'use client';

import { UseFormReset } from 'react-hook-form';
import type { ProgramTemplate } from '@/lib/supabase/schemas/program-templates';
import {
  useCreateProgramTemplate,
  useUpdateProgramTemplate,
} from '@/hooks/use-program-template-mutations';
import type { ProgramTemplateFormData } from '@/app/program/program/schemas';

interface UseProgramFormSubmitProps {
  initialData?: ProgramTemplate | null;
  reset: UseFormReset<ProgramTemplateFormData>;
  onSuccess?: () => void;
}

export function useProgramFormSubmit({
  initialData,
  reset,
  onSuccess,
}: UseProgramFormSubmitProps) {
  const createMutation = useCreateProgramTemplate({ onSuccess });
  const updateMutation = useUpdateProgramTemplate({ onSuccess });

  const onSubmit = async (data: ProgramTemplateFormData) => {
    if (initialData) {
      updateMutation.mutate({
        templateId: initialData.id,
        name: data.name,
        weeks: data.weeks,
        startDate: data.startDate,
        endDate: data.endDate,
        description: data.description || null,
        goals: data.goals || null,
        notes: data.notes || null,
        organizationId: initialData.organization_id || null,
      });
    } else {
      createMutation.mutate({
        name: data.name,
        weeks: data.weeks,
        startDate: data.startDate,
        description: data.description || null,
        goals: data.goals || null,
        notes: data.notes || null,
        organizationId: data.organizationId ?? null,
      });

      reset({
        name: '',
        description: '',
        weeks: 4,
        goals: '',
        notes: '',
        organizationId: data.organizationId ?? null,
        startDate: undefined as unknown as Date,
        endDate: undefined as unknown as Date,
      });
    }
  };

  return {
    onSubmit,
    isSubmitting: createMutation.isPending || updateMutation.isPending,
  };
}
