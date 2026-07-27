import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/service-role'

export async function POST(request: NextRequest) {
  try {
    const { appointmentId } = await request.json()
    
    if (!appointmentId) {
      return NextResponse.json({
        success: false,
        error: 'appointmentId is required'
      }, { status: 400 })
    }

    // Call the test_mark_as_attended function
    const { data, error } = await supabaseAdmin.rpc('test_mark_as_attended', {
      appointment_id_param: parseInt(appointmentId)
    })

    if (error) {
      throw new Error(`Failed to mark appointment as attended: ${error.message}`)
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error(`Error marking appointment as attended:`, error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
