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
  'consultation_booked',
  'consultation_attended',
  'screening_booked',
  'screening_attended',
  'intake_survey_completed',
  'process_purchase',
  'process_refund',
] as const

export type TalonV2EventType = (typeof TALON_V2_EVENT_TYPES)[number]

export const TALON_V2_CAMPAIGN_LABELS: Record<TalonV2EventType, string> = {
  onboarded: 'Onboarding (80)',
  program_change: 'Assign Program (84)',
  exercise_completed: 'Complete Exercise (82)',
  qa_advance_time: 'Advance Time (83)',
  reset_user: 'Reset User (81)',
  screening_booked: 'Screening Booked (93)',
  screening_attended: 'Screening Attended (93)',
  consultation_booked: 'Consultation Booked (94)',
  consultation_attended: 'Consultation Attended (94)',
  intake_survey_completed: 'Intake Survey Completed (95)',
  process_purchase: 'Process Purchase (rewards)',
  process_refund: 'Process Refund (rewards)',
}

/**
 * Event-entity boolean flag when it differs from the Integration API type.
 * Prefer `v2LogicalEventPayload` for new pre-program events (parent T1 types).
 */
export function v2EventFlagAttribute(type: TalonV2EventType): string {
  if (type === 'exercise_completed') return 'exerciseCompleted'
  return type
}

/**
 * Map QA logical slugs → Talon.One Integration custom event type + attrs.
 * Sandbox app 2 registers parent types (`consultation` / `screening` /
 * `intake_survey`), not `*_booked` / `*_attended` / `intake_survey_completed`.
 * Booked/attended rules need the parent flag + camelCase discriminator.
 */
export function v2LogicalEventPayload(type: TalonV2EventType): {
  integrationType: string
  attributes: Record<string, boolean>
} {
  switch (type) {
    case 'consultation_booked':
      return {
        integrationType: 'consultation',
        attributes: { consultation: true, consultationBooked: true },
      }
    case 'consultation_attended':
      return {
        integrationType: 'consultation',
        attributes: { consultation: true, consultationAttended: true },
      }
    case 'screening_booked':
      return {
        integrationType: 'screening',
        attributes: { screening: true, screeningBooked: true },
      }
    case 'screening_attended':
      return {
        integrationType: 'screening',
        attributes: { screening: true, screeningAttended: true },
      }
    case 'intake_survey_completed':
      return {
        integrationType: 'intake_survey',
        attributes: { intake_survey: true },
      }
    case 'process_purchase':
      return {
        integrationType: 'process_purchase',
        attributes: { processPurchase: true },
      }
    case 'process_refund':
      return {
        integrationType: 'process_refund',
        attributes: { processRefund: true },
      }
    default:
      return {
        integrationType: type,
        attributes: { [v2EventFlagAttribute(type)]: true },
      }
  }
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

export interface ProcessPurchaseEffectsSummary {
  effects: unknown[]
  debit: number | null
  noDebit: boolean
}

/** Empty effects (or no matching deduct) means T1 did not debit VP. */
export function summarizeProcessPurchaseEffects(
  body: unknown,
): ProcessPurchaseEffectsSummary {
  if (!body || typeof body !== 'object') {
    return { effects: [], debit: null, noDebit: true }
  }
  const rawEffects = (body as { effects?: unknown }).effects
  const effects = Array.isArray(rawEffects) ? rawEffects : []
  let debit: number | null = null
  for (const raw of effects) {
    if (!raw || typeof raw !== 'object') continue
    const effect = raw as Record<string, unknown>
    const props =
      effect.props && typeof effect.props === 'object'
        ? (effect.props as Record<string, unknown>)
        : effect
    const type = String(effect.effectType ?? effect.type ?? '')
    if (type !== 'deductLoyaltyPoints') continue
    const sub = props.subLedgerId ?? props.subledgerId ?? ''
    if (sub !== '' && sub !== null) continue
    const value = Number(props.value ?? props.amount ?? effect.value)
    if (Number.isFinite(value)) {
      debit = value
      break
    }
  }
  return { effects, debit, noDebit: debit === null }
}

export interface ProcessRefundEffectsSummary {
  effects: unknown[]
  credit: number | null
  noCredit: boolean
}

/** Empty effects (or no matching add) means T1 did not credit VP. */
export function summarizeProcessRefundEffects(
  body: unknown,
): ProcessRefundEffectsSummary {
  if (!body || typeof body !== 'object') {
    return { effects: [], credit: null, noCredit: true }
  }
  const rawEffects = (body as { effects?: unknown }).effects
  const effects = Array.isArray(rawEffects) ? rawEffects : []
  let credit: number | null = null
  for (const raw of effects) {
    if (!raw || typeof raw !== 'object') continue
    const effect = raw as Record<string, unknown>
    const props =
      effect.props && typeof effect.props === 'object'
        ? (effect.props as Record<string, unknown>)
        : effect
    const type = String(effect.effectType ?? effect.type ?? '')
    if (type !== 'addLoyaltyPoints') continue
    const sub = props.subLedgerId ?? props.subledgerId ?? ''
    if (sub !== '' && sub !== null) continue
    const value = Number(props.value ?? props.amount ?? effect.value)
    if (Number.isFinite(value)) {
      credit = value
      break
    }
  }
  return { effects, credit, noCredit: credit === null }
}
