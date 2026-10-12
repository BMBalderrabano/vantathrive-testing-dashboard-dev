import { NextResponse } from 'next/server'

import {
  getRewardsBackendConfig,
  listRewardSkus,
} from '@/lib/rewards-qa'

export async function GET() {
  try {
    const { url } = getRewardsBackendConfig()
    const skus = await listRewardSkus()
    return NextResponse.json({ backendUrl: url, skus })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 502 },
    )
  }
}
