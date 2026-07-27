'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn, isProgramStartDateDisabled, getNextProgramStartMonday } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

interface DateRangePickerProps {
  weeks: number;
  startDate: Date | undefined;
  dateRange: DateRange | undefined;
  onDateSelect: (range: DateRange | undefined) => void;
  errors: {
    startDate?: { message?: string };
    endDate?: { message?: string };
  };
}

export function DateRangePicker({
  weeks,
  startDate,
  dateRange,
  onDateSelect,
  errors,
}: DateRangePickerProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1">
          Start Date
        </label>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !startDate && 'text-muted-foreground',
              )}
            >
              {startDate ? (
                format(startDate, 'PPP')
              ) : (
                <span>Pick a start date (optional for templates)</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            {weeks >= 1 ? (
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={onDateSelect}
                defaultMonth={startDate || getNextProgramStartMonday()}
                numberOfMonths={1}
                disabled={isProgramStartDateDisabled}
                weekStartsOn={1}
                className="w-full [--cell-size:2rem]"
              />
            ) : (
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => {
                  if (date) {
                    onDateSelect({ from: date, to: undefined });
                  } else {
                    onDateSelect(undefined);
                  }
                }}
                defaultMonth={startDate || getNextProgramStartMonday()}
                numberOfMonths={1}
                disabled={isProgramStartDateDisabled}
                weekStartsOn={1}
                className="w-full [--cell-size:2rem]"
              />
            )}
          </PopoverContent>
        </Popover>
        <p className="text-xs text-muted-foreground mt-1">
          Must be a Monday (today or later).
        </p>
        {errors.startDate && (
          <p className="text-sm text-red-500 mt-1">
            {errors.startDate.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1">
          End Date
        </label>
        <Input
          value={
            dateRange?.to
              ? format(dateRange.to, 'PPP')
              : startDate
                ? 'Calculating...'
                : 'Select start date and weeks'
          }
          disabled
          className="bg-muted/50 text-muted-foreground"
        />
        {errors.endDate && (
          <p className="text-sm text-red-500 mt-1">{errors.endDate.message}</p>
        )}
      </div>
    </div>
  );
}
