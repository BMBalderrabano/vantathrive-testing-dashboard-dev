import { NextRequest, NextResponse } from 'next/server'

import {
  TALON_V2_EVENT_TYPES,
  buildExerciseExternalSessionId,
  buildQaAdvanceTimeAttributes,
  loadProfileTimezone,
  maybeStampLoyaltyResetAt,
  postTalonEvent,
  v2EventFlagAttribute,
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
    let attributes: Record<string, TalonAttributeValue> = {
      [v2EventFlagAttribute(eventType)]: true,
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
    }

    const result = await postTalonEvent({
      profileId,
      type: eventType,
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
