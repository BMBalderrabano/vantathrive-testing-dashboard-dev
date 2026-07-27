import { ProgramBuilder } from './program/builder';
import { PreProgramCard } from './program/pre-program-card';
import { getProgramAssignmentsPaginated, getPreProgramTemplate } from './actions';
import { BuilderContextProvider } from '@/context/builder-context';

export default async function ProgramListPage() {
  const pageSize = 21;
  const [initialPageResult, preProgramResult] = await Promise.all([
    getProgramAssignmentsPaginated(1, pageSize),
    getPreProgramTemplate(),
  ]);

  const initialData = initialPageResult.success
    ? {
        pages: [initialPageResult.data],
        pageParams: [1] as number[],
      }
    : undefined;

  const preProgramAssignment =
    preProgramResult.success && preProgramResult.data
      ? preProgramResult.data
      : null;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Program Builder
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create and edit program templates. Header org filter applies to the
          list; create form defaults to the selected org.
        </p>
      </div>
      <BuilderContextProvider initialAssignment={null} initialSchedule={null}>
        {preProgramAssignment ? (
          <PreProgramCard assignment={preProgramAssignment} />
        ) : null}
        <ProgramBuilder initialData={initialData} />
      </BuilderContextProvider>
    </>
  );
}
