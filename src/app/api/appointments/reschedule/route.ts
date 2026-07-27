import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdminLegacy as supabaseAdmin } from '@/lib/supabase/service-role'

interface RescheduleRequest {
  user_id: string
  appointment_type: 'onboarding_screening' | 'onboarding_consultation'
  start_time: string
}

export async function POST(request: NextRequest) {
  try {
    const { user_id, appointment_type, start_time }: RescheduleRequest =
      await request.json()

    if (!user_id || !appointment_type || !start_time) {
      return NextResponse.json(
        {
          success: false,
          error: 'user_id, appointment_type, and start_time are required',
        },
        { status: 400 }
      )
    }

    if (
      appointment_type !== 'onboarding_screening' &&
      appointment_type !== 'onboarding_consultation'
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'appointment_type must be onboarding_screening or onboarding_consultation',
        },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseAdmin.rpc('test_reschedule_appointment', {
      p_user_id: user_id,
      p_type: appointment_type,
      p_start_time: start_time,
    })

    if (error) {
      throw new Error(`Failed to reschedule appointment: ${error.message}`)
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error rescheduling appointment:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
