import type { Exercise } from '@/lib/supabase/schemas/exercises';
import type {
  ExerciseTemplate,
  Group,
} from '@/lib/supabase/schemas/exercise-templates';

export type SelectedItem =
  | { type: 'exercise'; data: Exercise }
  | { type: 'template'; data: ExerciseTemplate }
  | {
      type: 'group';
      data: Group;
    };

export interface TemplateConfigProps {
  item: Exclude<SelectedItem, { type: 'group' }> | null;
  position: { x: number; y: number };
  onClose: () => void;
  copiedData: Partial<ExerciseTemplate> | null;
  onCopy: (data: Partial<ExerciseTemplate>) => void;
  onUpdate?: (data: Partial<ExerciseTemplate>) => void;
  onSuccessWithTemplate?: (template: ExerciseTemplate) => void;
  onSaveStart?: () => void;
}

export type TabType = 'all' | 'set';
