/** Integration API event types the QA dashboard may fire. */
export const TALON_EVENT_TYPES = [
  'exercise_post_check',
  'onboarded',
  'exercise_daily_completion',
  'check_in_question',
  'reset_user',
  /** Triggers Campaign Manager "Update loyalty points expiry date" rules. */
  'qa_advance_loyalty_expiry',
] as const

export type TalonEventType = (typeof TALON_EVENT_TYPES)[number]

export const QA_ADVANCE_LOYALTY_EXPIRY_EVENT =
  'qa_advance_loyalty_expiry' satisfies TalonEventType
