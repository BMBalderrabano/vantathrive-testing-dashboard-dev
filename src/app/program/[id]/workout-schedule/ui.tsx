'use client';

import { useState } from 'react';
import { WeekNavigation } from './week-navigation';
import { DayBoxesGrid } from './day-boxes-grid';
import { Button } from '@/components/ui/button';
import { useBuilder } from '@/context/builder-context';
import {
  useUpsertWorkoutSchedule,
  useUpdateProgramSchedule,
} from '@/hooks/use-workout-schedule-mutations';
import { useUpdateProgramTemplate } from '@/hooks/use-program-template-mutations';
import toast from 'react-hot-toast';
import { useFormContext } from 'react-hook-form';
import type { ProgramTemplate } from '@/lib/supabase/schemas/program-templates';
import type { ProgramTemplateFormData } from '../../program/schemas';
import { cn } from '@/lib/utils';
import { createParallelQueries } from '@/lib/supabase/parallel-queries';
import type { SupabaseSuccess, SupabaseError } from '@/lib/supabase/parallel-queries';
import { useDefaultValues } from '../default-values/use-default-values';
import { UpdateDerivedDialog } from './update-derived-dialog';
import { updateDerivedProgramSchedules, updateDerivedPreProgramSchedules } from '../../actions';
import { useQueryClient } from '@tanstack/react-query';
import { programAssignmentsKeys } from '@/hooks/use-passignments';
import { ProgramAssignment } from '@/lib/supabase/schemas/program-assignments';
import { PROGRAM_ASSIGNMENT_STATUS } from '@/lib/constants/program-assignment-status';

type BuilderAssignmentStatus =
  | typeof PROGRAM_ASSIGNMENT_STATUS.ACTIVE
  | typeof PROGRAM_ASSIGNMENT_STATUS.TEMPLATE
  | typeof PROGRAM_ASSIGNMENT_STATUS.PRE_PROGRAM_TEMPLATE;

interface BuildWorkoutSectionProps {
  initialWeeks: number;
  template: ProgramTemplate;
  assignmentStatus?: BuilderAssignmentStatus;
}

export function BuildWorkoutSection({
  initialWeeks,
  template,
  assignmentStatus = 'template',
}: BuildWorkoutSectionProps) {
  const { schedule, programAssignmentId } = useBuilder();
  const programForm = useFormContext<ProgramTemplateFormData>();
  const { values: defaultValues } = useDefaultValues();
  const [showDerivedDialog, setShowDerivedDialog] = useState(false);
  const queryClient = useQueryClient();

  const updateProgramTemplateMutation = useUpdateProgramTemplate({
    suppressToast: true,
  });

  const updateProgramScheduleMutation = useUpdateProgramSchedule({
    suppressToast: true,
  });

  const upsertScheduleMutation = useUpsertWorkoutSchedule({
    suppressToast: true,
  });

  const handleSave = async () => {
    if (!programAssignmentId) {
      toast.error('No program assignment found');
      return;
    }

    const isFormValid = await programForm.trigger();
    if (!isFormValid) {
      toast.error('Fix program details errors before saving');
      return;
    }

    // Check if schedule has any content
    const hasContent = schedule.some((week) =>
      week.some((day) => day.length > 0),
    );

    if (!hasContent) {
      toast.error('Cannot save empty schedule');
      return;
    }

    // Pre-program template: always propagate, no confirmation dialog
    if (assignmentStatus === PROGRAM_ASSIGNMENT_STATUS.PRE_PROGRAM_TEMPLATE) {
      await performSave(true);
      return;
    }

    // If editing a template, show confirmation dialog
    if (assignmentStatus === PROGRAM_ASSIGNMENT_STATUS.TEMPLATE) {
      setShowDerivedDialog(true);
      return;
    }

    // If editing active assignment, proceed directly
    await performSave(false);
  };

  const performSave = async (updateDerived: boolean) => {
    if (!programAssignmentId) return;

    const values = programForm.getValues();
    const isPreProgramTemplate =
      assignmentStatus === PROGRAM_ASSIGNMENT_STATUS.PRE_PROGRAM_TEMPLATE;
    const isRegularTemplate =
      assignmentStatus === PROGRAM_ASSIGNMENT_STATUS.TEMPLATE;


    try {
      const result = await createParallelQueries({
        template: {
          query: async (): Promise<SupabaseSuccess<ProgramTemplate> | SupabaseError> => {
            try {
              const result = await updateProgramTemplateMutation.mutateAsync({
                templateId: template.id,
                name: isPreProgramTemplate ? template.name : values.name,
                weeks: values.weeks,
                startDate: isRegularTemplate || isPreProgramTemplate
                  ? undefined
                  : values.startDate,
                endDate: isRegularTemplate || isPreProgramTemplate
                  ? undefined
                  : values.endDate,
                description: isPreProgramTemplate
                  ? template.description ?? null
                  : values.description?.trim() || null,
                goals: isPreProgramTemplate
                  ? template.goals ?? null
                  : values.goals?.trim() || null,
                notes: isPreProgramTemplate
                  ? template.notes ?? null
                  : values.notes?.trim() || null,
                organizationId: template.organization_id || null,
              });
              return { success: true, data: result };
            } catch (error) {
              return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update template',
                status: 500,
              };
            }
          },
          required: true,
        },
        schedule: {
          query: async (): Promise<
            SupabaseSuccess<{ id: string; schedule_hash: string }> | SupabaseError
          > => {
            try {
              const scheduleResult = await upsertScheduleMutation.mutateAsync({
                schedule,
                assignmentId: programAssignmentId,
                defaultValues,
              });
              return { success: true, data: scheduleResult };
            } catch (error) {
              return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to save schedule',
                status: 500,
              };
            }
          },
          required: true,
        },
        assignment: {
          query: async (
            deps: {
              template: ProgramTemplate;
              schedule: { id: string; schedule_hash: string };
            },
          ): Promise<SupabaseSuccess<ProgramAssignment> | SupabaseError> => {
            try {
              await updateProgramScheduleMutation.mutateAsync({
                assignmentId: programAssignmentId,
                workoutScheduleId: deps.schedule.id,
              });
              return { success: true, data: { id: programAssignmentId } as ProgramAssignment };
            } catch (error) {
              return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update assignment',
                status: 500,
              };
            }
          },
          dependsOn: ['template', 'schedule'] as const,
          required: false,
        },
      });

      if (isPreProgramTemplate && result.schedule) {
        const derivedResult = await updateDerivedPreProgramSchedules(
          programAssignmentId,
          result.schedule.id,
        );

        if (derivedResult.success) {
          const count = derivedResult.data;

          await queryClient.invalidateQueries({
            queryKey: programAssignmentsKeys.all,
          });

          if (count > 0) {
            toast.success(
              `Saved and updated ${count} pre-program user${count !== 1 ? 's' : ''}`,
            );
          } else {
            toast.success('Saved (no pre-program users to update)');
          }
        } else {
          toast.success('Template saved, but failed to update pre-program users');
        }
      } else if (isRegularTemplate && updateDerived && result.schedule) {
        const derivedResult = await updateDerivedProgramSchedules(
          programAssignmentId,
          result.schedule.id,
        );

        if (derivedResult.success) {
          const count = derivedResult.data;
          
          // Invalidate all program assignment queries to refresh UI
          await queryClient.invalidateQueries({
            queryKey: programAssignmentsKeys.all,
          });

          if (count > 0) {
            toast.success(`Saved and updated ${count} active program${count !== 1 ? 's' : ''}`);
          } else {
            toast.success('Saved (no active programs to update)');
          }
        } else {
          toast.success('Template saved, but failed to update active programs');
        }
      } else {
        toast.success('Saved');
      }

      setShowDerivedDialog(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Save failed';
      toast.error(message);
      setShowDerivedDialog(false);
    }
  };

  const isSaving =
    upsertScheduleMutation.isPending ||
    updateProgramScheduleMutation.isPending ||
    updateProgramTemplateMutation.isPending;
  const isDisabled = !programAssignmentId || isSaving;

  return (
    <>
      <div className="w-full">
        <div className="w-full flex items-center justify-between px-5 py-4">
          <span className="text-lg font-semibold text-foreground">Build Workout</span>
          <Button
            onClick={handleSave}
            disabled={isDisabled}
            size="sm"
            className="cursor-pointer"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
        <div
          className={cn(
            'px-5 pb-5 pt-4 border-t border-border',
            isDisabled && 'disabled-div',
          )}
        >
          <div className="space-y-6">
            <WeekNavigation initialWeeks={initialWeeks} />
            <DayBoxesGrid />
          </div>
        </div>
      </div>

      <UpdateDerivedDialog
        open={showDerivedDialog}
        onOpenChange={setShowDerivedDialog}
        onConfirm={performSave}
        loading={isSaving}
      />
    </>
  );
}
