import { NextRequest, NextResponse } from 'next/server'

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

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
