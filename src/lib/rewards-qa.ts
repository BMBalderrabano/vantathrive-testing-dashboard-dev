import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const DEFAULT_LOCAL_BACKEND_URL = 'http://127.0.0.1:15440'

/**
 * Public supabase-local demo keys. Used only when the rewards backend is
 * loopback and LOCAL_BACKEND_* is unset. Not linked-dev / hosted keys.
 */
const LOCAL_DEMO_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const LOCAL_DEMO_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const VISIBLE_REDEMPTION_STATUSES = ['locked', 'pending_t1', 'redeemed'] as const

export interface RewardsBackendConfig {
  url: string
  anonKey: string
  serviceRoleKey: string
}

export interface RewardSku {
  id: string
  name: string
  vendor: string | null
  status: string
  vp_cost: number | null
  face_value: number | null
  unused_count: number
}

export interface RewardRedemption {
  id: string
  reward_id: string
  status: string
  reward_name: string
  vp_cost: number
  face_value: number | null
  url: string | null
  url_visible: boolean
  hp_before: number | null
  needs_attention: boolean
  attention_reason: string | null
  t1_http_status: number | null
  redeemed_at: string | null
  created_at: string
}

function isLoopbackUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname
    return host === '127.0.0.1' || host === 'localhost'
  } catch {
    return false
  }
}

export function getRewardsBackendConfig(): RewardsBackendConfig {
  const explicit = process.env.LOCAL_BACKEND_URL?.trim()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ''
  const url = (
    explicit ||
    (isLoopbackUrl(supabaseUrl) ? supabaseUrl : '') ||
    DEFAULT_LOCAL_BACKEND_URL
  ).replace(/\/$/, '')

  const local = isLoopbackUrl(url)
  const anonKey =
    process.env.LOCAL_BACKEND_ANON_KEY?.trim() ||
    (local
      ? LOCAL_DEMO_ANON_KEY
      : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
  const serviceRoleKey =
    process.env.LOCAL_BACKEND_SERVICE_ROLE_KEY?.trim() ||
    (local
      ? LOCAL_DEMO_SERVICE_ROLE_KEY
      : process.env.SUPABASE_SERVICE_ROLE_KEY || '')

  return { url, anonKey, serviceRoleKey }
}

function createBackendClient(key: string): SupabaseClient {
  const { url } = getRewardsBackendConfig()
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function loyaltyFrom(client: SupabaseClient) {
  return client.schema('loyalty')
}

export async function listRewardSkus(): Promise<RewardSku[]> {
  const { serviceRoleKey } = getRewardsBackendConfig()
  if (!serviceRoleKey) {
    throw new Error('Rewards backend service role key is not configured')
  }
  const client = createBackendClient(serviceRoleKey)
  const loyalty = loyaltyFrom(client)

  const { data: rewards, error } = await loyalty
    .from('rewards')
    .select('id, name, vendor, status, vp_cost, face_value, sort_order')
    .in('status', ['live', 'paused'])
    .order('sort_order', { ascending: true })

  if (error) {
    throw new Error(`Failed to list rewards: ${error.message}`)
  }

  const ids = (rewards ?? []).map((row) => row.id as string)
  const unusedByReward = new Map<string, number>()
  if (ids.length > 0) {
    const { data: links, error: linksError } = await loyalty
      .from('reward_links')
      .select('reward_id')
      .in('reward_id', ids)
      .eq('status', 'unused')

    if (linksError) {
      throw new Error(`Failed to count unused links: ${linksError.message}`)
    }
    for (const link of links ?? []) {
      const rewardId = link.reward_id as string
      unusedByReward.set(rewardId, (unusedByReward.get(rewardId) ?? 0) + 1)
    }
  }

  return (rewards ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    vendor: (row.vendor as string | null) ?? null,
    status: row.status as string,
    vp_cost: (row.vp_cost as number | null) ?? null,
    face_value: (row.face_value as number | null) ?? null,
    unused_count: unusedByReward.get(row.id as string) ?? 0,
  }))
}

export async function listUserRedemptions(
  userId: string,
): Promise<RewardRedemption[]> {
  const { serviceRoleKey } = getRewardsBackendConfig()
  if (!serviceRoleKey) {
    throw new Error('Rewards backend service role key is not configured')
  }
  const client = createBackendClient(serviceRoleKey)
  const { data, error } = await loyaltyFrom(client)
    .from('reward_redemptions')
    .select(
      'id, reward_id, status, reward_name, vp_cost, face_value, url, hp_before, needs_attention, attention_reason, t1_http_status, redeemed_at, created_at',
    )
    .eq('user_id', userId)
    .in('status', [...VISIBLE_REDEMPTION_STATUSES])
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to list redemptions: ${error.message}`)
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    reward_id: row.reward_id as string,
    status: row.status as string,
    reward_name: row.reward_name as string,
    vp_cost: row.vp_cost as number,
    face_value: (row.face_value as number | null) ?? null,
    url: (row.url as string | null) ?? null,
    url_visible: true,
    hp_before: (row.hp_before as number | null) ?? null,
    needs_attention: Boolean(row.needs_attention),
    attention_reason: (row.attention_reason as string | null) ?? null,
    t1_http_status: (row.t1_http_status as number | null) ?? null,
    redeemed_at: (row.redeemed_at as string | null) ?? null,
    created_at: row.created_at as string,
  }))
}

export async function mintSelectedUserJwt(userId: string): Promise<{
  accessToken: string
  email: string
}> {
  const { url, anonKey, serviceRoleKey } = getRewardsBackendConfig()
  if (!anonKey || !serviceRoleKey) {
    throw new Error('Rewards backend keys are not configured')
  }

  const admin = createBackendClient(serviceRoleKey)
  const { data: userData, error: userError } =
    await admin.auth.admin.getUserById(userId)
  if (userError || !userData.user) {
    throw new Error(
      `Selected user ${userId} is not on rewards backend ${url}`,
    )
  }

  const email = userData.user.email
  if (!email) {
    throw new Error(`Selected user ${userId} has no email on ${url}`)
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  const hashedToken = link?.properties?.hashed_token
  if (linkError || !hashedToken) {
    throw new Error(linkError?.message || 'Failed to mint selected-user JWT')
  }

  const anon = createBackendClient(anonKey)
  const { data: session, error: otpError } = await anon.auth.verifyOtp({
    type: 'email',
    token_hash: hashedToken,
  })
  if (otpError || !session.session?.access_token) {
    throw new Error(otpError?.message || 'Failed to verify selected-user JWT')
  }

  return { accessToken: session.session.access_token, email }
}

export async function redeemRewardAsUser(params: {
  userId: string
  rewardId: string
}): Promise<{ status: number; body: unknown; backendUrl: string }> {
  const { url, anonKey } = getRewardsBackendConfig()
  const { accessToken } = await mintSelectedUserJwt(params.userId)

  const response = await fetch(`${url}/functions/v1/redeem_reward`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reward_id: params.rewardId }),
  })

  const contentType = response.headers.get('content-type')
  let body: unknown
  if (contentType && contentType.includes('application/json')) {
    body = await response.json()
  } else {
    body = { error: await response.text(), raw: true }
  }

  return { status: response.status, body, backendUrl: url }
}
