/** Integration API event types the QA dashboard may fire (app 1 / V1). */
export const TALON_EVENT_TYPES = [
  'exercise_post_check',
  'onboarded',
  'exercise_daily_completion',
  'check_in_question',
  'qa_advance_time',
  'reset_user',
] as const

export type TalonEventType = (typeof TALON_EVENT_TYPES)[number]

/** App 2 / V2 campaign event types (TALON_ONE_VANTATHRIVE_DEV_2). */
export const TALON_V2_EVENT_TYPES = [
  'onboarded',
  'program_change',
  'exercise_completed',
  'qa_advance_time',
  'reset_user',
] as const

export type TalonV2EventType = (typeof TALON_V2_EVENT_TYPES)[number]

export const TALON_V2_CAMPAIGN_LABELS: Record<TalonV2EventType, string> = {
  onboarded: 'Onboarding (80)',
  program_change: 'Assign Program (84)',
  exercise_completed: 'Complete Exercise (82)',
  qa_advance_time: 'Advance Time (83)',
  reset_user: 'Reset User (81)',
}

/** Campaign 47 / V2 Advance Time: reset ephemeral subledgers after a calendar jump. */
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

/** V2 Complete Exercise session id: epochMs-exerciseId */
export function buildExerciseExternalSessionId(
  exerciseId: number,
  epochMs: number = Date.now(),
): string {
  return `${epochMs}-${exerciseId}`
}
