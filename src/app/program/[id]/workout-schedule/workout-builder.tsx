'use client';

import { useMemo, useEffect } from 'react';
import { useBuilder } from '@/context/builder-context';
import { ProgramDetailsSection } from '../../program/ui';
import { BuildWorkoutSection } from './ui';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import type { ProgramAssignmentWithTemplate } from '@/lib/supabase/schemas/program-assignments';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  programTemplateFormSchema,
  type ProgramTemplateFormData,
} from '../../program/schemas';
import { getNextProgramStartMonday, parseLocalDateString } from '@/lib/utils';
import {
  isPreProgramTemplateStatus,
  PROGRAM_ASSIGNMENT_STATUS,
} from '@/lib/constants/program-assignment-status';
import { PreProgramWarningBanner } from '../pre-program-warning-banner';

interface WorkoutBuilderProps {
  assignmentId: string | undefined;
  initialAssignment: ProgramAssignmentWithTemplate;
  programDetailsCollapsed?: boolean;
}

export function WorkoutBuilder({
  assignmentId,
  initialAssignment,
  programDetailsCollapsed = false,
}: WorkoutBuilderProps) {
  const { initializeSchedule, setSelectedAssignmentId, schedule } = useBuilder();

  const template = initialAssignment.program_template;
  const isPreProgramTemplate = isPreProgramTemplateStatus(initialAssignment.status);

  const formDefaultValues = useMemo(() => ({
    name: template?.name || '',
    description: template?.description || '',
    weeks: template?.weeks || 4,
    goals: template?.goals || '',
    notes: template?.notes || '',
    startDate: initialAssignment.status === PROGRAM_ASSIGNMENT_STATUS.TEMPLATE ||
      isPreProgramTemplate
      ? undefined
      : (initialAssignment.start_date ? parseLocalDateString(initialAssignment.start_date) : getNextProgramStartMonday()),
    endDate: initialAssignment.status === PROGRAM_ASSIGNMENT_STATUS.TEMPLATE ||
      isPreProgramTemplate
      ? undefined
      : (initialAssignment.end_date ? parseLocalDateString(initialAssignment.end_date) : undefined),
    imageFile: undefined,
    imagePreview: undefined,
  }), [initialAssignment, template, isPreProgramTemplate]);

  const builderAssignmentStatus =
    initialAssignment.status === PROGRAM_ASSIGNMENT_STATUS.ACTIVE
      ? PROGRAM_ASSIGNMENT_STATUS.ACTIVE
      : initialAssignment.status === PROGRAM_ASSIGNMENT_STATUS.PRE_PROGRAM_TEMPLATE
        ? PROGRAM_ASSIGNMENT_STATUS.PRE_PROGRAM_TEMPLATE
        : PROGRAM_ASSIGNMENT_STATUS.TEMPLATE;

  // Initialize context when assignment data is available
  useEffect(() => {
    if (assignmentId) {
      setSelectedAssignmentId(assignmentId);
    }

    // Only initialize schedule if it's empty - don't overwrite server-provided data
    if (initialAssignment.program_template && assignmentId && schedule.length === 0) {
      initializeSchedule(template.weeks);
    }
  }, [assignmentId, initialAssignment.program_template, template.weeks, setSelectedAssignmentId, initializeSchedule, schedule]);

  const programForm = useForm<ProgramTemplateFormData>({
    resolver: zodResolver(programTemplateFormSchema),
    defaultValues: formDefaultValues,
  });

  if (!initialAssignment || !template) {
    return (
      <div
        suppressHydrationWarning
        className="p-6 flex-1 min-h-0 overflow-y-auto h-full slim-scrollbar flex items-center justify-center"
      >
        <p className="text-muted-foreground">Program not found</p>
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="flex flex-col overflow-hidden">
          <div className="flex-1">
            <div className="p-5 sm:p-6 space-y-6">
              {isPreProgramTemplate ? <PreProgramWarningBanner /> : null}
              <FormProvider {...programForm}>
                <ProgramDetailsSection
                  template={template}
                  initialAssignment={initialAssignment}
                  status={initialAssignment.status}
                  hideActions
                  formMethods={programForm}
                  defaultOpen={!programDetailsCollapsed}
                />
                <BuildWorkoutSection
                  initialWeeks={template.weeks}
                  template={template}
                  assignmentStatus={builderAssignmentStatus}
                />
              </FormProvider>
            </div>
          </div>
        </Card>
      </motion.div>
    </>
  );
}
