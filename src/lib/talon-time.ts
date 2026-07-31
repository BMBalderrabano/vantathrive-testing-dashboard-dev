import { startOfDay, startOfWeek } from 'date-fns'
import { tz } from '@date-fns/tz'

const DEFAULT_TIMEZONE = 'UTC'

/** Validate IANA timezone; empty/invalid → UTC. */
export function resolveTimezone(timezone: string | null | undefined): string {
  if (typeof timezone !== 'string') return DEFAULT_TIMEZONE
  const candidate = timezone.trim()
  if (!candidate) return DEFAULT_TIMEZONE

  try {
    Intl.DateTimeFormat(undefined, { timeZone: candidate })
    return candidate
  } catch {
    return DEFAULT_TIMEZONE
  }
}

/** Talon Time format: 2024-07-24T14:15:22Z (UTC, second precision). */
export function formatTalonTime(date: Date): string {
  return new Date(date.getTime()).toISOString().replace(/\.\d{3}Z$/, 'Z')
}

/** UTC instant for local midnight of the current day in `timezone`. */
export function getStartOfDayUtc(
  timezone: string | null | undefined,
  now: Date = new Date(),
): string {
  const resolved = resolveTimezone(timezone)
  const start = startOfDay(now, { in: tz(resolved) })
  return formatTalonTime(start)
}

/** UTC instant for local Monday 00:00 of the current week in `timezone`. */
export function getStartOfWeekUtc(
  timezone: string | null | undefined,
  now: Date = new Date(),
): string {
  const resolved = resolveTimezone(timezone)
  const start = startOfWeek(now, { in: tz(resolved), weekStartsOn: 1 })
  return formatTalonTime(start)
}
