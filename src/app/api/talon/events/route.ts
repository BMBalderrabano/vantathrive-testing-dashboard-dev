import { NextRequest, NextResponse } from 'next/server'

import {
  TALON_EVENT_TYPES,
  QA_ADVANCE_LOYALTY_EXPIRY_EVENT,
  buildQaAdvanceLoyaltyExpiryAttributes,
  loadProfileTimezone,
  postTalonEvent,
  type TalonEventType,
} from '@/lib/talon-client'
import { getStartOfDayUtc, getStartOfWeekUtc } from '@/lib/talon-time'

interface TalonEventRequest {
  profileId?: string
  type?: string
  /** Hours to simulate ahead for qa_advance_loyalty_expiry (default 0). */
  hours?: number
}

export async function POST(request: NextRequest) {
  try {
    const { profileId, type, hours }: TalonEventRequest = await request.json()

    if (typeof profileId !== 'string' || profileId.trim() === '') {
      return NextResponse.json(
        { error: 'profileId must be a non-empty string' },
        { status: 400 },
      )
    }

    if (!type || !TALON_EVENT_TYPES.includes(type as TalonEventType)) {
      return NextResponse.json(
        {
          error: `type must be one of: ${TALON_EVENT_TYPES.join(', ')}`,
        },
        { status: 400 },
      )
    }

    const eventType = type as TalonEventType
    let attributes: Record<string, boolean | string>

    if (eventType === QA_ADVANCE_LOYALTY_EXPIRY_EVENT) {
      const advanceHours =
        typeof hours === 'number' && Number.isFinite(hours) ? hours : 0
      attributes = await buildQaAdvanceLoyaltyExpiryAttributes(
        profileId,
        advanceHours,
      )
    } else {
      attributes = { [eventType]: true }

      if (
        eventType === 'exercise_daily_completion' ||
        eventType === 'check_in_question'
      ) {
        const timezone = await loadProfileTimezone(profileId)

        if (eventType === 'exercise_daily_completion') {
          attributes.start_of_day = getStartOfDayUtc(timezone)
        } else {
          attributes.start_of_week = getStartOfWeekUtc(timezone)
        }
      }
    }

    const result = await postTalonEvent({
      profileId,
      type: eventType,
      attributes,
    })

    if (result.skipped) {
      return NextResponse.json({ error: result.reason }, { status: 500 })
    }

    return NextResponse.json(result.body, { status: result.status ?? 502 })
  } catch (error) {
    console.error('Error calling Talon.One events API:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    )
  }
}
