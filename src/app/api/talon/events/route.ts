import { NextRequest, NextResponse } from 'next/server'

import { supabaseAdmin } from '@/lib/supabase/service-role'
import { getStartOfDayUtc, getStartOfWeekUtc } from '@/lib/talon-time'

const TALON_EVENT_TYPES = [
  'exercise_post_check',
  'onboarded',
  'exercise_daily_completion',
  'check_in_question',
  'reset_user',
] as const

type TalonEventType = (typeof TALON_EVENT_TYPES)[number]

interface TalonEventRequest {
  profileId?: string
  type?: string
}

const DEFAULT_TALON_BASE_URL = 'https://medvanta.us-east4.talon.one'

async function loadProfileTimezone(profileId: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('timezone')
      .eq('id', profileId)
      .maybeSingle()

    if (error) {
      console.warn(
        'Failed to load profiles.timezone for Talon event; falling back to UTC',
        error,
      )
      return null
    }

    return data?.timezone ?? null
  } catch (error) {
    console.warn(
      'Failed to load profiles.timezone for Talon event; falling back to UTC',
      error,
    )
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const { profileId, type }: TalonEventRequest = await request.json()

    if (typeof profileId !== 'string' || profileId.trim() === '') {
      return NextResponse.json(
        { error: 'profileId must be a non-empty string' },
        { status: 400 }
      )
    }

    if (!type || !TALON_EVENT_TYPES.includes(type as TalonEventType)) {
      return NextResponse.json(
        {
          error: `type must be one of: ${TALON_EVENT_TYPES.join(', ')}`,
        },
        { status: 400 }
      )
    }

    const apiKey = process.env.TALON_ONE_VANTATHRIVE_DEV
    if (!apiKey) {
      return NextResponse.json(
        { error: 'TALON_ONE_VANTATHRIVE_DEV is not configured' },
        { status: 500 }
      )
    }

    const baseUrl = (
      process.env.TALON_ONE_BASE_URL || DEFAULT_TALON_BASE_URL
    ).replace(/\/$/, '')

    const attributes: Record<string, boolean | string> = { [type]: true }

    if (type === 'exercise_daily_completion' || type === 'check_in_question') {
      const timezone = await loadProfileTimezone(profileId)

      if (type === 'exercise_daily_completion') {
        attributes.start_of_day = getStartOfDayUtc(timezone)
      } else {
        attributes.start_of_week = getStartOfWeekUtc(timezone)
      }
    }

    const talonResponse = await fetch(`${baseUrl}/v2/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `ApiKey-v1 ${apiKey}`,
      },
      body: JSON.stringify({
        profileId,
        type,
        attributes,
        responseContent: ['loyalty'],
      }),
    })

    const contentType = talonResponse.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      const data = await talonResponse.json()
      return NextResponse.json(data, { status: talonResponse.status })
    }

    const text = await talonResponse.text()
    return NextResponse.json(
      { error: text, raw: true },
      { status: talonResponse.status }
    )
  } catch (error) {
    console.error('Error calling Talon.One events API:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    )
  }
}
