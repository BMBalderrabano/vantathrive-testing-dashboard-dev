import { NextRequest, NextResponse } from 'next/server'

import { postQaAdvanceLoyaltyExpiry } from '@/lib/talon-client'

export async function POST(request: NextRequest) {
  try {
    const { user_id, hours, user_logged_in, process_workouts } =
      await request.json()

    if (typeof user_id !== 'string' || user_id.trim() === '') {
      return NextResponse.json(
        { error: 'user_id must be a non-empty string' },
        { status: 400 },
      )
    }

    if (typeof hours !== 'number' || !Number.isFinite(hours)) {
      return NextResponse.json(
        { error: 'hours must be a finite number' },
        { status: 400 },
      )
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/advance_time`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          user_id,
          hours,
          user_logged_in,
          process_workouts,
        }),
      },
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    // Soft-fail: app time still advances even if Talon is misconfigured / rules missing.
    // Requires Campaign Manager rules on event qa_advance_loyalty_expiry that use
    // "Update loyalty points expiry date" for subledgers current_day_vp (start_of_day)
    // and info_points_weekly (start_of_week).
    const talon = await postQaAdvanceLoyaltyExpiry(user_id, hours)

    return NextResponse.json({ ...data, talon })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
