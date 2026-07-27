import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { startOfDay, isBefore } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(
  date: string,
  format: Intl.DateTimeFormatOptions['dateStyle'] = 'medium',
) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: format }).format(
    new Date(date),
  );
}

export function getDayOfWeek(day_index: number) {
  return [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ][day_index - 1];
}

export function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

/**
 * Parse a YYYY-MM-DD date string as local date
 */
export function parseLocalDateString(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Format date to YYYY-MM-DD in UTC to match Supabase timezone
 * Creates a UTC date from local date components to ensure the date string matches what the user sees
 * @param date - The date to format
 * @returns Formatted date string in YYYY-MM-DD format
 */
export function formatDateForDB(date: Date): string {
  // Extract local date components (what user sees in calendar)
  const localYear = date.getFullYear();
  const localMonth = date.getMonth();
  const localDay = date.getDate();
  // Create UTC date from local components to ensure consistent storage
  const utcDate = new Date(Date.UTC(localYear, localMonth, localDay));
  // Format as YYYY-MM-DD using UTC methods
  const year = utcDate.getUTCFullYear();
  const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(utcDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate end date from start date and weeks
 * @param startDate - The start date
 * @param weeks - Number of weeks to add
 * @returns The end date or undefined if startDate is invalid or weeks < 1
 */
export function calculateEndDate(
  startDate: Date | undefined,
  weeks: number,
): Date | undefined {
  if (!startDate || weeks < 1) return undefined;
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + weeks * 7 - 1);
  return endDate;
}

/** Monday = 1 in JS getDay() */
const MONDAY = 1;

/**
 * Returns true if a date should be disabled for program start date pickers:
 * past dates or any day that is not Monday. Use for Calendar disabled prop.
 */
export function isProgramStartDateDisabled(date: Date): boolean {
  const day = startOfDay(date);
  const today = startOfDay(new Date());
  if (isBefore(day, today)) return true;
  return day.getDay() !== MONDAY;
}

/** Next Monday from now, or today if today is Monday (for program start default). */
export function getNextProgramStartMonday(): Date {
  const today = startOfDay(new Date());
  if (today.getDay() === MONDAY) return today;
  const next = new Date(today);
  const daysUntilMonday = (MONDAY + 7 - today.getDay()) % 7;
  next.setDate(next.getDate() + (daysUntilMonday || 7));
  return next;
}
