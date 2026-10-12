import { NextRequest, NextResponse } from 'next/server'

import {
  getRewardsBackendConfig,
  listUserRedemptions,
} from '@/lib/rewards-qa'

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId')?.trim()
  if (!userId) {
    return NextResponse.json(
      { error: 'userId query param is required' },
      { status: 400 },
    )
  }

  try {
    const { url } = getRewardsBackendConfig()
    const redemptions = await listUserRedemptions(userId)
    return NextResponse.json({
      backendUrl: url,
      urlVisibility: 'service_role',
      redemptions,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 502 },
    )
  }
}
