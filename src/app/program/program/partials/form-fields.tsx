'use client';

import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ProgramTemplateFormData } from '../schemas';

interface FormFieldProps {
  register: UseFormRegister<ProgramTemplateFormData>;
  errors: FieldErrors<ProgramTemplateFormData>;
}

export function FormTextField({
  register,
  errors,
  name,
  label,
  placeholder,
  required = false,
  disabled = false,
}: FormFieldProps & {
  name: keyof ProgramTemplateFormData;
  label: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="block text-sm font-medium text-muted-foreground mb-1"
      >
        {label} {required && '*'}
      </label>
      <Input
        id={name}
        {...register(name)}
        placeholder={placeholder}
        disabled={disabled}
      />
      {errors[name] && (
        <p className="text-sm text-red-500 mt-1">
          {errors[name]?.message as string}
        </p>
      )}
    </div>
  );
}

export function FormNumberField({
  register,
  errors,
  name,
  label,
  min = 1,
  required = false,
  disabled = false,
}: FormFieldProps & {
  name: keyof ProgramTemplateFormData;
  label: string;
  min?: number;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="block text-sm font-medium text-muted-foreground mb-1"
      >
        {label} {required && '*'}
      </label>
      <Input
        id={name}
        type="number"
        min={min}
        disabled={disabled}
        {...register(name, {
          valueAsNumber: true,
        })}
      />
      {errors[name] && (
        <p className="text-sm text-red-500 mt-1">
          {errors[name]?.message as string}
        </p>
      )}
    </div>
  );
}

export function FormTextareaField({
  register,
  errors,
  name,
  label,
  placeholder,
  rows = 3,
  disabled = false,
}: FormFieldProps & {
  name: keyof ProgramTemplateFormData;
  label: string;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="block text-sm font-medium text-muted-foreground mb-1"
      >
        {label}
      </label>
      <Textarea
        id={name}
        {...register(name)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
      />
      {errors[name] && (
        <p className="text-sm text-red-500 mt-1">
          {errors[name]?.message as string}
        </p>
      )}
    </div>
  );
}
