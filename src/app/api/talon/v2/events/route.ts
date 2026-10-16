import { NextRequest, NextResponse } from 'next/server'

import {
  TALON_V2_EVENT_TYPES,
  buildExerciseExternalSessionId,
  buildQaAdvanceTimeAttributes,
  loadProfileTimezone,
  maybeStampLoyaltyResetAt,
  postTalonEvent,
  v2LogicalEventPayload,
  type TalonAttributeValue,
  type TalonV2EventType,
} from '@/lib/talon-client'
import {
  getEndOfWeekUtc,
  programStartDateToTalonUtc,
} from '@/lib/talon-time'

interface TalonV2EventRequest {
  profileId?: string
  type?: string
  /** Calendar YYYY-MM-DD; mapped to Talon event attr program_start_date. */
  programStartDate?: string
  /** Required for exercise_completed when not orchestrated elsewhere. */
  exerciseId?: number
  isDayComplete?: boolean
  endOfWeek?: string
  externalSessionID?: string
  /** Required for process_purchase. */
  purchaseCost?: number
  /** Optional; generated when omitted. Replay of the same id is ledger-idempotent. */
  purchaseID?: string
  /** Required for process_refund. */
  refundAmount?: number
}

export async function POST(request: NextRequest) {
  try {
    const body: TalonV2EventRequest = await request.json()
    const { profileId, type } = body

    if (typeof profileId !== 'string' || profileId.trim() === '') {
      return NextResponse.json(
        { error: 'profileId must be a non-empty string' },
        { status: 400 },
      )
    }

    if (!type || !TALON_V2_EVENT_TYPES.includes(type as TalonV2EventType)) {
      return NextResponse.json(
        {
          error: `type must be one of: ${TALON_V2_EVENT_TYPES.join(', ')}`,
        },
        { status: 400 },
      )
    }

    const eventType = type as TalonV2EventType
    const timezone = await loadProfileTimezone(profileId)
    const logical = v2LogicalEventPayload(eventType)
    const integrationType = logical.integrationType
    let attributes: Record<string, TalonAttributeValue> = {
      ...logical.attributes,
    }

    if (eventType === 'qa_advance_time') {
      attributes = buildQaAdvanceTimeAttributes({ advanceWeek: true })
    } else if (eventType === 'program_change') {
      if (
        typeof body.programStartDate !== 'string' ||
        body.programStartDate.trim() === ''
      ) {
        return NextResponse.json(
          { error: 'programStartDate is required for program_change' },
          { status: 400 },
        )
      }
      try {
        attributes.program_start_date = programStartDateToTalonUtc(
          body.programStartDate,
        )
      } catch (error) {
        return NextResponse.json(
          {
            error:
              error instanceof Error
                ? error.message
                : 'Invalid programStartDate',
          },
          { status: 400 },
        )
      }
    } else if (eventType === 'exercise_completed') {
      if (
        typeof body.exerciseId !== 'number' ||
        !Number.isFinite(body.exerciseId)
      ) {
        return NextResponse.json(
          { error: 'exerciseId is required for exercise_completed' },
          { status: 400 },
        )
      }

      const isDayComplete = body.isDayComplete === true
      attributes.isDayComplete = isDayComplete
      attributes.endOfWeek =
        typeof body.endOfWeek === 'string' && body.endOfWeek.trim()
          ? body.endOfWeek
          : getEndOfWeekUtc(timezone)
      attributes.externalSessionID =
        typeof body.externalSessionID === 'string' &&
        body.externalSessionID.trim()
          ? body.externalSessionID.trim()
          : buildExerciseExternalSessionId(body.exerciseId)
    } else if (eventType === 'process_purchase') {
      if (
        typeof body.purchaseCost !== 'number' ||
        !Number.isFinite(body.purchaseCost) ||
        body.purchaseCost <= 0
      ) {
        return NextResponse.json(
          { error: 'purchaseCost must be a positive number' },
          { status: 400 },
        )
      }
      attributes.purchaseCost = body.purchaseCost
      attributes.purchaseID =
        typeof body.purchaseID === 'string' && body.purchaseID.trim()
          ? body.purchaseID.trim()
          : crypto.randomUUID()
    } else if (eventType === 'process_refund') {
      if (
        typeof body.refundAmount !== 'number' ||
        !Number.isInteger(body.refundAmount) ||
        body.refundAmount <= 0
      ) {
        return NextResponse.json(
          { error: 'refundAmount must be a positive integer' },
          { status: 400 },
        )
      }
      attributes.refundAmount = body.refundAmount
      attributes.purchaseID =
        typeof body.purchaseID === 'string' && body.purchaseID.trim()
          ? body.purchaseID.trim()
          : crypto.randomUUID()
    }

    const result = await postTalonEvent({
      profileId,
      type: integrationType,
      attributes,
      app: 'v2',
    })

    if (result.skipped) {
      return NextResponse.json({ error: result.reason }, { status: 500 })
    }

    const resetAtWarning = await maybeStampLoyaltyResetAt({
      type: eventType,
      status: result.status,
      profileId,
    })
    if (resetAtWarning) {
      console.warn('Talon V2 reset_user stamp warning:', resetAtWarning)
    }

    return NextResponse.json(
      {
        ...((result.body && typeof result.body === 'object'
          ? result.body
          : { body: result.body }) as object),
        _qa: {
          type: eventType,
          integrationType,
          attributes,
          status: result.status,
          ...(resetAtWarning ? { resetAtWarning } : {}),
        },
      },
      { status: result.status ?? 502 },
    )
  } catch (error) {
    console.error('Error calling Talon.One V2 events API:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    )
  }
}
