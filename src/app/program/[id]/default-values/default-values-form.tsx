'use client';

import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { TempoInput } from '../template-config/partials/tempo-input';
import type { DefaultValuesData } from './schemas';

interface DefaultValuesFormProps {
  form: UseFormReturn<DefaultValuesData>;
  formData: DefaultValuesData;
}

export function DefaultValuesForm({ form, formData }: DefaultValuesFormProps) {
  const { setValue, register } = form;

  return (
    <div className="p-4 space-y-4">
      {/* Sets */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground w-24 shrink-0">Sets</span>
        <Input
          className="flex-1"
          min="1"
          type="number"
          {...register('sets', { valueAsNumber: true })}
        />
      </div>

      {/* Reps */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground w-24 shrink-0">Reps</span>
        <Input
          className="flex-1"
          min="0"
          type="number"
          placeholder="Leave empty for none"
          value={formData.rep ?? ''}
          onChange={(e) => {
            const value = e.target.value ? parseInt(e.target.value) : null;
            setValue('rep', value);
          }}
        />
      </div>

      {/* Distance */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground w-24 shrink-0">Distance</span>
        <Input
          className="flex-[2]"
          min="0"
          step="0.1"
          type="number"
          placeholder="Leave empty for none"
          value={formData.distance ?? ''}
          onChange={(e) => setValue('distance', e.target.value || null)}
        />
        <Select
          className="flex-1"
          value={formData.distanceUnit}
          onChange={(e) => setValue('distanceUnit', e.target.value)}
        >
          <option value="m">m</option>
          <option value="km">km</option>
          <option value="mi">mi</option>
          <option value="ft">ft</option>
          <option value="yd">yd</option>
        </Select>
      </div>

      {/* Weight */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground w-24 shrink-0">Weight</span>
        <Input
          className="flex-[2]"
          min="0"
          step="0.1"
          type="number"
          placeholder="Leave empty for none"
          value={formData.weight ?? ''}
          onChange={(e) => setValue('weight', e.target.value || null)}
        />
        <Select
          className="flex-1"
          value={formData.weightUnit}
          onChange={(e) => setValue('weightUnit', e.target.value)}
        >
          <option value="kg">kg</option>
          <option value="lb">lb</option>
          <option value="oz">oz</option>
        </Select>
      </div>

      {/* Time */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground w-24 shrink-0">Time (s)</span>
        <Input
          className="flex-1"
          min="0"
          type="number"
          placeholder="Leave empty for none"
          value={formData.time ?? ''}
          onChange={(e) => {
            const value = e.target.value ? parseInt(e.target.value) : null;
            setValue('time', value);
          }}
        />
      </div>

      {/* Rest */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground w-24 shrink-0">Rest (s)</span>
        <Input
          className="flex-1"
          min="0"
          type="number"
          placeholder="Leave empty for none"
          value={formData.rest_time ?? ''}
          onChange={(e) => {
            const value = e.target.value ? parseInt(e.target.value) : null;
            setValue('rest_time', value);
          }}
        />
      </div>

      {/* Tempo */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground w-24 shrink-0">Tempo</span>
        <TempoInput
          value={formData.tempo}
          onChange={(value: (string | null)[]) => {
            setValue('tempo', value as [string | null, string | null, string | null, string | null]);
          }}
          disabled={false}
        />
      </div>
    </div>
  );
}
