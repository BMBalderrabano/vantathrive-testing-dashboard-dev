import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdminLegacy as supabaseAdmin } from '@/lib/supabase/service-role'

export async function POST(request: NextRequest) {
  try {
    const { appointmentId } = await request.json()

    if (!appointmentId) {
      return NextResponse.json({
        success: false,
        error: 'appointmentId is required'
      }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin.rpc('test_delete_appointment', {
      p_appointment_id: parseInt(appointmentId, 10)
    })

    if (error) {
      throw new Error(`Failed to delete appointment: ${error.message}`)
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error force-deleting appointment:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
