'use client';

import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import { useOrganizations } from '@/hooks/use-organizations';
import type { ProgramTemplateFormData } from '../schemas';

interface OrgPickerFieldProps {
  control: Control<ProgramTemplateFormData>;
  errors: FieldErrors<ProgramTemplateFormData>;
  disabled?: boolean;
}

export function OrgPickerField({
  control,
  errors,
  disabled = false,
}: OrgPickerFieldProps) {
  const { data: organizations = [], isLoading } = useOrganizations();

  return (
    <div>
      <label
        htmlFor="organizationId"
        className="block text-sm font-medium text-muted-foreground mb-1"
      >
        Organization
      </label>
      <Controller
        control={control}
        name="organizationId"
        render={({ field }) => (
          <select
            id="organizationId"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            disabled={disabled || isLoading}
            value={field.value ?? ''}
            onChange={(e) =>
              field.onChange(e.target.value === '' ? null : e.target.value)
            }
          >
            <option value="">No organization</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        )}
      />
      {errors.organizationId && (
        <p className="text-sm text-red-500 mt-1">
          {errors.organizationId.message}
        </p>
      )}
    </div>
  );
}
