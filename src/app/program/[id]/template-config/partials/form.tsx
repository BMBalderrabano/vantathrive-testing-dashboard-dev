import { Controller, UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { TempoInput } from './tempo-input';
import type { TabType } from '../types';
import type { TemplateFormData } from '../schemas';

interface TemplateConfigFormProps {
  form: UseFormReturn<TemplateFormData>;
  formData: TemplateFormData;
  activeTab: TabType;
  currentSetIndex: number;
  setCurrentValue: (
    field: 'rep' | 'time' | 'rest_time' | 'distance' | 'weight',
    value: number | string | null,
  ) => void;
  disabled?: boolean;
}

export function TemplateConfigForm({
  form,
  formData,
  activeTab,
  currentSetIndex,
  setCurrentValue,
  disabled,
}: TemplateConfigFormProps) {
  const { control, setValue } = form;

  const currentRep =
    activeTab === 'all' ? formData.rep : (formData.rep_override ?? [])[currentSetIndex];
  const currentTime =
    activeTab === 'all'
      ? formData.time
      : (formData.time_override ?? [])[currentSetIndex];
  const currentRest =
    activeTab === 'all'
      ? formData.rest_time
      : (formData.rest_time_override ?? [])[currentSetIndex];
  const currentDistance =
    activeTab === 'all'
      ? formData.distance
      : (formData.distance_override ?? [])[currentSetIndex];
  const currentDistanceUnit =
    activeTab === 'all'
      ? formData.distanceUnit
      : (formData.distance_override_units ?? [])[currentSetIndex] || 'm';
  const currentWeight =
    activeTab === 'all'
      ? formData.weight
      : (formData.weight_override ?? [])[currentSetIndex];
  const currentWeightUnit =
    activeTab === 'all'
      ? formData.weightUnit
      : (formData.weight_override_units ?? [])[currentSetIndex] || 'kg';
  const currentTempo =
    activeTab === 'all' ? formData.tempo : formData.tempo;

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-14 shrink-0">Reps</span>
        {activeTab === 'all' ? (
          <Input
            className="flex-1 h-10 text-xs"
            min="0"
            placeholder=""
            type="number"
            value={currentRep ?? ''}
            onChange={(e) => {
              const value = e.target.value ? parseInt(e.target.value) : null;
              setCurrentValue('rep', value);
            }}
            disabled={disabled}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
        ) : (
          <Controller
            name="rep_override"
            control={control}
            render={({ field }) => {
              const arr = (field.value ?? []).slice();
              while (arr.length <= currentSetIndex) arr.push(null);
              const current = arr[currentSetIndex];
              return (
                <Input
                  className="flex-1 h-10 text-xs"
                  min="0"
                  placeholder={formData.rep != null ? String(formData.rep) : ''}
                  type="number"
                  value={current ?? ''}
                  onChange={(e) => {
                    const v = e.target.value ? parseInt(e.target.value) : null;
                    const next = [...arr];
                    next[currentSetIndex] = v;
                    field.onChange(next);
                  }}
                  disabled={disabled}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              );
            }}
          />
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-14 shrink-0">Distance</span>
        <Controller
          name={activeTab === 'all' ? 'distance' : 'distance_override'}
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              className="flex-2 min-w-0 h-10 text-xs"
              min="0"
              step="0.1"
              placeholder={
                activeTab === 'set' && formData.distance
                  ? String(formData.distance)
                  : ''
              }
              type="number"
              value={
                activeTab === 'all'
                  ? currentDistance ?? ''
                  : currentDistance ?? ''
              }
              onChange={(e) => {
                if (activeTab === 'all') {
                  setValue('distance', e.target.value || null);
                } else {
                  setCurrentValue('distance', e.target.value || null);
                }
              }}
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                (e.target as HTMLInputElement).focus();
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
            />
          )}
        />
        <Controller
          name={
            activeTab === 'all'
              ? 'distanceUnit'
              : 'distance_override_units'
          }
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              className="flex-1 min-w-0 h-10 text-xs text-center"
              value={
                activeTab === 'all'
                  ? currentDistanceUnit
                  : currentDistanceUnit
              }
              onChange={(e) => {
                if (activeTab === 'all') {
                  setValue('distanceUnit', e.target.value);
                } else {
                  const units = [...(formData.distance_override_units ?? [])];
                  units[currentSetIndex] = e.target.value;
                  setValue('distance_override_units', units);
                }
              }}
              disabled={disabled}
            >
              <option value="m">m</option>
              <option value="km">km</option>
              <option value="mi">mi</option>
              <option value="ft">ft</option>
              <option value="yd">yd</option>
            </Select>
          )}
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-14 shrink-0">Weight</span>
        <Controller
          name={activeTab === 'all' ? 'weight' : 'weight_override'}
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              className="flex-2 min-w-0 h-10 text-xs"
              min="0"
              step="0.1"
              placeholder={
                activeTab === 'set' && formData.weight
                  ? String(formData.weight)
                  : ''
              }
              type="number"
              value={activeTab === 'all' ? currentWeight ?? '' : currentWeight ?? ''}
              onChange={(e) => {
                if (activeTab === 'all') {
                  setValue('weight', e.target.value || null);
                } else {
                  setCurrentValue('weight', e.target.value || null);
                }
              }}
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                (e.target as HTMLInputElement).focus();
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
            />
          )}
        />
        <Controller
          name={activeTab === 'all' ? 'weightUnit' : 'weight_override_units'}
          control={control}
          render={({ field }) => (
            <Select
              {...field}
              className="flex-1 min-w-0 h-10 text-xs text-center"
              value={activeTab === 'all' ? currentWeightUnit : currentWeightUnit}
              onChange={(e) => {
                if (activeTab === 'all') {
                  setValue('weightUnit', e.target.value);
                } else {
                  const units = [...(formData.weight_override_units ?? [])];
                  units[currentSetIndex] = e.target.value;
                  setValue('weight_override_units', units);
                }
              }}
              disabled={disabled}
            >
              <option value="kg">kg</option>
              <option value="lb">lb</option>
              <option value="oz">oz</option>
            </Select>
          )}
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-14 shrink-0">Time (s)</span>
        {activeTab === 'all' ? (
          <Input
            className="flex-1 h-10 text-xs"
            min="0"
            placeholder=""
            type="number"
            value={currentTime ?? ''}
            onChange={(e) => {
              const value = e.target.value ? parseInt(e.target.value) : null;
              setCurrentValue('time', value);
            }}
            disabled={disabled}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
        ) : (
          <Controller
            name="time_override"
            control={control}
            render={({ field }) => {
              const arr = (field.value ?? []).slice();
              while (arr.length <= currentSetIndex) arr.push(null);
              const current = arr[currentSetIndex];
              return (
                <Input
                  className="flex-1 h-10 text-xs"
                  min="0"
                  placeholder={formData.time != null ? String(formData.time) : ''}
                  type="number"
                  value={current ?? ''}
                  onChange={(e) => {
                    const v = e.target.value ? parseInt(e.target.value) : null;
                    const next = [...arr];
                    next[currentSetIndex] = v;
                    field.onChange(next);
                  }}
                  disabled={disabled}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              );
            }}
          />
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-14 shrink-0">Rest (s)</span>
        {activeTab === 'all' ? (
          <Input
            className="flex-1 h-10 text-xs"
            min="0"
            placeholder=""
            type="number"
            value={currentRest ?? ''}
            onChange={(e) => {
              const value = e.target.value ? parseInt(e.target.value) : null;
              setCurrentValue('rest_time', value);
            }}
            disabled={disabled}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
        ) : (
          <Controller
            name="rest_time_override"
            control={control}
            render={({ field }) => {
              const arr = (field.value ?? []).slice();
              while (arr.length <= currentSetIndex) arr.push(null);
              const current = arr[currentSetIndex];
              return (
                <Input
                  className="flex-1 h-10 text-xs"
                  min="0"
                  placeholder={formData.rest_time != null ? String(formData.rest_time) : ''}
                  type="number"
                  value={current ?? ''}
                  onChange={(e) => {
                    const v = e.target.value ? parseInt(e.target.value) : null;
                    const next = [...arr];
                    next[currentSetIndex] = v;
                    field.onChange(next);
                  }}
                  disabled={disabled}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              );
            }}
          />
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-14 shrink-0">Tempo</span>
        <Controller
          name="tempo"
          control={control}
          render={() => (
            <TempoInput
              value={currentTempo}
              onChange={(value: (string | null)[]) => {
                setValue('tempo', value as [string | null, string | null, string | null, string | null]);
              }}
              disabled={activeTab === 'set' || disabled}
            />
          )}
        />
      </div>
    </div>
  );
}
