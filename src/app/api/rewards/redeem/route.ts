import { NextRequest, NextResponse } from 'next/server'

import { redeemRewardAsUser } from '@/lib/rewards-qa'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const userId =
      typeof body.userId === 'string' ? body.userId.trim() : ''
    const rewardId =
      typeof body.reward_id === 'string'
        ? body.reward_id.trim()
        : typeof body.rewardId === 'string'
          ? body.rewardId.trim()
          : ''

    if (!userId) {
      return NextResponse.json(
        { error: 'userId must be a non-empty string' },
        { status: 400 },
      )
    }
    if (!/^[0-9a-f-]{36}$/i.test(rewardId)) {
      return NextResponse.json(
        { error: 'reward_id must be a UUID' },
        { status: 400 },
      )
    }

    const result = await redeemRewardAsUser({ userId, rewardId })
    return NextResponse.json(
      {
        ...(result.body && typeof result.body === 'object'
          ? result.body
          : { body: result.body }),
        backendUrl: result.backendUrl,
        _qa: {
          usedUserJwt: true,
          path: '/functions/v1/redeem_reward',
        },
      },
      { status: result.status },
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 502 },
    )
  }
}
