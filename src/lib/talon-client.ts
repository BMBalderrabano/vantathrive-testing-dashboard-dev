import 'server-only'

import { supabaseAdmin } from '@/lib/supabase/service-role'
import {
  QA_ADVANCE_LOYALTY_EXPIRY_EVENT,
  type TalonEventType,
} from '@/lib/talon-constants'
import {
  formatTalonTime,
  getStartOfDayUtc,
  getStartOfWeekUtc,
} from '@/lib/talon-time'

export {
  QA_ADVANCE_LOYALTY_EXPIRY_EVENT,
  TALON_EVENT_TYPES,
  type TalonEventType,
} from '@/lib/talon-constants'

export const DEFAULT_TALON_BASE_URL = 'https://medvanta.us-east4.talon.one'

export interface TalonEventCallResult {
  skipped?: boolean
  reason?: string
  status?: number
  body?: unknown
  type?: TalonEventType
  attributes?: Record<string, boolean | string>
}

export async function loadProfileTimezone(
  profileId: string,
): Promise<string | null> {
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

function getTalonConfig():
  | { ok: true; apiKey: string; baseUrl: string }
  | { ok: false; reason: string } {
  const apiKey = process.env.TALON_ONE_VANTATHRIVE_DEV
  if (!apiKey) {
    return { ok: false, reason: 'TALON_ONE_VANTATHRIVE_DEV is not configured' }
  }

  const baseUrl = (
    process.env.TALON_ONE_BASE_URL || DEFAULT_TALON_BASE_URL
  ).replace(/\/$/, '')

  return { ok: true, apiKey, baseUrl }
}

/** Build attributes for qa_advance_loyalty_expiry at simulated now = wall clock + hours. */
export async function buildQaAdvanceLoyaltyExpiryAttributes(
  profileId: string,
  hours: number,
): Promise<Record<string, boolean | string>> {
  const timezone = await loadProfileTimezone(profileId)
  const simulatedNow = new Date(Date.now() + hours * 60 * 60 * 1000)

  return {
    [QA_ADVANCE_LOYALTY_EXPIRY_EVENT]: true,
    start_of_day: getStartOfDayUtc(timezone, simulatedNow),
    start_of_week: getStartOfWeekUtc(timezone, simulatedNow),
    qa_loyalty_now: formatTalonTime(simulatedNow),
  }
}

export async function postTalonEvent(params: {
  profileId: string
  type: TalonEventType
  attributes: Record<string, boolean | string>
}): Promise<TalonEventCallResult> {
  const config = getTalonConfig()
  if (!config.ok) {
    return { skipped: true, reason: config.reason, type: params.type }
  }

  try {
    const talonResponse = await fetch(`${config.baseUrl}/v2/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `ApiKey-v1 ${config.apiKey}`,
      },
      body: JSON.stringify({
        profileId: params.profileId,
        type: params.type,
        attributes: params.attributes,
        responseContent: ['loyalty'],
      }),
    })

    const contentType = talonResponse.headers.get('content-type')
    let body: unknown
    if (contentType && contentType.includes('application/json')) {
      body = await talonResponse.json()
    } else {
      body = { error: await talonResponse.text(), raw: true }
    }

    return {
      status: talonResponse.status,
      body,
      type: params.type,
      attributes: params.attributes,
    }
  } catch (error) {
    return {
      status: 0,
      body: {
        error: error instanceof Error ? error.message : String(error),
      },
      type: params.type,
      attributes: params.attributes,
    }
  }
}

/**
 * Fire qa_advance_loyalty_expiry so Campaign Manager rules can run
 * "Update loyalty points expiry date" for current_day_vp / info_points_weekly
 * using start_of_day / start_of_week at simulated time (now + hours).
 */
export async function postQaAdvanceLoyaltyExpiry(
  profileId: string,
  hours: number,
): Promise<TalonEventCallResult> {
  if (!Number.isFinite(hours)) {
    return {
      skipped: true,
      reason: 'hours must be a finite number',
      type: QA_ADVANCE_LOYALTY_EXPIRY_EVENT,
    }
  }

  const attributes = await buildQaAdvanceLoyaltyExpiryAttributes(
    profileId,
    hours,
  )

  return postTalonEvent({
    profileId,
    type: QA_ADVANCE_LOYALTY_EXPIRY_EVENT,
    attributes,
  })
}
