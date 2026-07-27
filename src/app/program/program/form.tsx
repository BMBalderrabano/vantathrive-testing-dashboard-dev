'use client';

import { useRef, useEffect } from 'react';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { ProgramTemplate } from '@/lib/supabase/schemas/program-templates';
import type { ProgramAssignmentWithTemplate } from '@/lib/supabase/schemas/program-assignments';
import {
  programTemplateFormSchema,
  type ProgramTemplateFormData,
} from './schemas';
import { useProgramFormDates } from './hooks/use-program-form-dates';
import { useProgramFormInit } from './hooks/use-program-form-init';
import { useProgramFormSubmit } from './hooks/use-program-form-submit';
import { DateRangePicker } from './partials/date-range-picker';
import { OrgPickerField } from './partials/org-picker-field';
import {
  FormTextField,
  FormNumberField,
  FormTextareaField,
} from './partials/form-fields';

interface CreateTemplateFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: ProgramTemplate | null;
  initialAssignment?: ProgramAssignmentWithTemplate | null;
  showDates?: boolean;
  hideActions?: boolean;
  formMethods?: UseFormReturn<ProgramTemplateFormData>;
  lockMetadataExceptWeeks?: boolean;
  defaultOrganizationId?: string | null;
}

export function CreateTemplateForm({
  onSuccess,
  onCancel,
  initialData,
  initialAssignment,
  showDates = true,
  hideActions = false,
  formMethods,
  lockMetadataExceptWeeks = false,
  defaultOrganizationId = null,
}: CreateTemplateFormProps) {
  const loadedDatesForTemplateIdRef = useRef<string | null>(null);

  const defaultForm = useForm<ProgramTemplateFormData>({
    resolver: zodResolver(programTemplateFormSchema),
    defaultValues: {
      name: '',
      description: '',
      weeks: 4,
      goals: '',
      notes: '',
      organizationId: defaultOrganizationId,
      startDate: undefined as unknown as Date,
      endDate: undefined as unknown as Date,
    },
  });

  const form = formMethods ?? defaultForm;

  const { watch, reset, control } = form;
  const weeks = watch('weeks');

  useEffect(() => {
    if (!initialData && defaultOrganizationId) {
      form.setValue('organizationId', defaultOrganizationId);
    }
  }, [defaultOrganizationId, form, initialData]);

  useProgramFormInit({
    initialData,
    reset,
    getValues: form.getValues,
    loadedDatesForTemplateIdRef,
  });

  const { startDate, dateRange, handleDateSelect } = useProgramFormDates({
    initialData,
    initialAssignment,
    form,
    loadedDatesForTemplateIdRef,
  });

  const { onSubmit, isSubmitting } = useProgramFormSubmit({
    initialData,
    reset,
    onSuccess,
  });

  const handleCancel = () => {
    reset({
      name: '',
      description: '',
      weeks: 4,
      goals: '',
      notes: '',
      organizationId: defaultOrganizationId,
      startDate: undefined as unknown as Date,
      endDate: undefined as unknown as Date,
    });
    onCancel?.();
  };

  return (
    <FormProvider {...form}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card className="p-5 mb-6">
          {!initialData && (
            <h3 className="text-lg font-semibold mb-4 text-foreground">
              Create New Program
            </h3>
          )}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-4">
              <FormTextField
                register={form.register}
                errors={form.formState.errors}
                name="name"
                label="Name"
                placeholder="Program name"
                required
                disabled={lockMetadataExceptWeeks}
              />

              {!initialData && (
                <OrgPickerField
                  control={control}
                  errors={form.formState.errors}
                  disabled={lockMetadataExceptWeeks}
                />
              )}

              <FormNumberField
                register={form.register}
                errors={form.formState.errors}
                name="weeks"
                label="Weeks"
                min={1}
                required
              />

              {showDates && (
                <DateRangePicker
                  weeks={weeks}
                  startDate={startDate}
                  dateRange={dateRange}
                  onDateSelect={handleDateSelect}
                  errors={{
                    startDate: form.formState.errors.startDate,
                    endDate: form.formState.errors.endDate,
                  }}
                />
              )}

              <FormTextField
                register={form.register}
                errors={form.formState.errors}
                name="goals"
                label="Goals"
                placeholder="Build strength, muscle & balance"
                disabled={lockMetadataExceptWeeks}
              />

              <FormTextareaField
                register={form.register}
                errors={form.formState.errors}
                name="description"
                label="Description"
                placeholder="Program description"
                rows={3}
                disabled={lockMetadataExceptWeeks}
              />
            </div>

            <FormTextareaField
              register={form.register}
              errors={form.formState.errors}
              name="notes"
              label="Notes"
              placeholder="Notes for administrators and staff"
              rows={3}
              disabled={lockMetadataExceptWeeks}
            />

            {!hideActions && (
              <div className="flex gap-3 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? initialData
                      ? 'Updating...'
                      : 'Creating...'
                    : initialData
                      ? 'Update Program'
                      : 'Create Program'}
                </Button>
              </div>
            )}
          </form>
        </Card>
      </motion.div>
    </FormProvider>
  );
}
