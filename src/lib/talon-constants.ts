/** Integration API event types the QA dashboard may fire. */
export const TALON_EVENT_TYPES = [
  'exercise_post_check',
  'onboarded',
  'exercise_daily_completion',
  'check_in_question',
  'reset_user',
] as const

export type TalonEventType = (typeof TALON_EVENT_TYPES)[number]
