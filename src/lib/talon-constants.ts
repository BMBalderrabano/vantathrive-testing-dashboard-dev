/** Integration API event types the QA dashboard may fire. */
export const TALON_EVENT_TYPES = [
  'exercise_post_check',
  'onboarded',
  'exercise_daily_completion',
  'check_in_question',
  'qa_advance_time',
  'reset_user',
] as const

export type TalonEventType = (typeof TALON_EVENT_TYPES)[number]

/** Campaign 47: reset ephemeral subledgers after a calendar jump. */
export function buildQaAdvanceTimeAttributes(options?: {
  advanceWeek?: boolean
}): Record<string, boolean> {
  const attributes: Record<string, boolean> = {
    qa_advance_time: true,
    qa_advance_day: true,
  }
  if (options?.advanceWeek) {
    attributes.qa_advance_week = true
  }
  return attributes
}

/** Hour thresholds for Advance Time soft-fire: ≥24 day, ≥168 week. */
export function qaAdvanceAttrsFromHours(
  hours: number,
): Record<string, boolean> | null {
  if (!(hours >= 24)) return null
  return buildQaAdvanceTimeAttributes({ advanceWeek: hours >= 168 })
}
