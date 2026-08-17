import 'server-only'

import { supabaseAdmin } from '@/lib/supabase/service-role'
import {
  type TalonEventType,
  type TalonV2EventType,
} from '@/lib/talon-constants'

export {
  TALON_EVENT_TYPES,
  TALON_V2_EVENT_TYPES,
  TALON_V2_CAMPAIGN_LABELS,
  buildQaAdvanceTimeAttributes,
  qaAdvanceAttrsFromHours,
  buildExerciseExternalSessionId,
  type TalonEventType,
  type TalonV2EventType,
} from '@/lib/talon-constants'

export const DEFAULT_TALON_BASE_URL = 'https://medvanta.us-east4.talon.one'

export type TalonApp = 'v1' | 'v2'

export type TalonAttributeValue = boolean | string | number

export interface TalonEventCallResult {
  skipped?: boolean
  reason?: string
  status?: number
  body?: unknown
  type?: string
  attributes?: Record<string, TalonAttributeValue>
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

function getTalonConfig(
  app: TalonApp = 'v1',
):
  | { ok: true; apiKey: string; baseUrl: string }
  | { ok: false; reason: string } {
  const apiKey =
    app === 'v2'
      ? process.env.TALON_ONE_VANTATHRIVE_DEV_2
      : process.env.TALON_ONE_VANTATHRIVE_DEV

  if (!apiKey) {
    const envName =
      app === 'v2'
        ? 'TALON_ONE_VANTATHRIVE_DEV_2'
        : 'TALON_ONE_VANTATHRIVE_DEV'
    return { ok: false, reason: `${envName} is not configured` }
  }

  const baseUrl = (
    process.env.TALON_ONE_BASE_URL || DEFAULT_TALON_BASE_URL
  ).replace(/\/$/, '')

  return { ok: true, apiKey, baseUrl }
}

export async function postTalonEvent(params: {
  profileId: string
  type: TalonEventType | TalonV2EventType | string
  attributes: Record<string, TalonAttributeValue>
  app?: TalonApp
}): Promise<TalonEventCallResult> {
  const config = getTalonConfig(params.app ?? 'v1')
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
