import { BuilderContextProvider } from '@/context/builder-context';
import { WorkoutBuilder } from './workout-schedule/workout-builder';
import { ProgramAssignmentsQuery } from '@/lib/supabase/queries/program-assignments';
import { convertScheduleToSelectedItems } from '@/app/program/actions';
import type { SelectedItem } from '@/app/program/[id]/template-config/types';

export default async function ProgramEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const collapsed =
    resolvedSearchParams?.collapsed === '1' ||
    resolvedSearchParams?.collapsed === 'true';

  const programAssignmentsQuery = new ProgramAssignmentsQuery();
  const result = await programAssignmentsQuery.getById(id);

  if (!result.success) {
    throw new Error(result.error || 'Failed to load program assignment');
  }

  const programAssignment = result.data;

  const dbSchedule = programAssignment?.workout_schedule?.schedule;
  let convertedSchedule: SelectedItem[][][] | null = null;

  if (dbSchedule) {
    const conversionResult = await convertScheduleToSelectedItems(dbSchedule);
    if (conversionResult.success) {
      convertedSchedule = conversionResult.data as SelectedItem[][][];
    } else {
      console.error('Failed to convert schedule:', conversionResult.error);
    }
  }

  return (
    <>
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {programAssignment.program_template?.name ?? 'Program Editor'}
        </h1>
      </div>
      <BuilderContextProvider
        initialAssignment={programAssignment}
        initialSchedule={convertedSchedule}
      >
        <WorkoutBuilder
          assignmentId={id}
          initialAssignment={programAssignment}
          programDetailsCollapsed={collapsed}
        />
      </BuilderContextProvider>
    </>
  );
}
