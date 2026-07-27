import { CollapsibleSection } from '@/components/common/collapsible-section';
import { CreateTemplateForm } from './form';
import type { ProgramTemplate } from '@/lib/supabase/schemas/program-templates';
import type { ProgramAssignmentWithTemplate } from '@/lib/supabase/schemas/program-assignments';
import type { ProgramTemplateFormData } from './schemas';
import type { UseFormReturn } from 'react-hook-form';
import { isPreProgramTemplateStatus } from '@/lib/constants/program-assignment-status';

interface ProgramDetailsSectionProps {
  template: ProgramTemplate | null;
  initialAssignment?: ProgramAssignmentWithTemplate | null;
  status: string | null;
  hideActions?: boolean;
  formMethods?: UseFormReturn<ProgramTemplateFormData>;
  defaultOpen?: boolean;
}

export function ProgramDetailsSection({
  template,
  initialAssignment,
  status,
  hideActions = false,
  formMethods,
  defaultOpen = true,
}: ProgramDetailsSectionProps) {
  const lockMetadataExceptWeeks = isPreProgramTemplateStatus(status);

  return (
    <CollapsibleSection title="Program Details" defaultOpen={defaultOpen}>
      <CreateTemplateForm
        initialData={template}
        initialAssignment={initialAssignment}
        showDates={status !== 'template' && !lockMetadataExceptWeeks}
        hideActions={hideActions}
        formMethods={formMethods}
        lockMetadataExceptWeeks={lockMetadataExceptWeeks}
      />
    </CollapsibleSection>
  );
}
