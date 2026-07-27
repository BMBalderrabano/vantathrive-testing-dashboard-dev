import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/service-role'

export async function POST(request: NextRequest) {
  try {
    const { appointmentId, cancellation_reason } = await request.json()

    if (!appointmentId) {
      return NextResponse.json({
        success: false,
        error: 'appointmentId is required'
      }, { status: 400 })
    }

    if (!cancellation_reason || typeof cancellation_reason !== 'string' || !cancellation_reason.trim()) {
      return NextResponse.json({
        success: false,
        error: 'cancellation_reason is required'
      }, { status: 400 })
    }

    const { data: appointment, error: fetchError } = await supabaseAdmin
      .from('appointments')
      .select('id, user_id, type, status')
      .eq('id', parseInt(appointmentId, 10))
      .single()

    if (fetchError || !appointment) {
      return NextResponse.json({
        success: false,
        error: 'Invalid appointment ID'
      }, { status: 404 })
    }

    if (appointment.status === 'canceled') {
      return NextResponse.json({
        success: false,
        error: 'Appointment has already been canceled'
      }, { status: 400 })
    }

    if (appointment.status === 'attended') {
      return NextResponse.json({
        success: false,
        error: 'Cannot cancel an attended appointment'
      }, { status: 400 })
    }

    if (appointment.status !== 'scheduled') {
      return NextResponse.json({
        success: false,
        error: 'Appointment status is not scheduled'
      }, { status: 400 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('appointments')
      .update({
        status: 'canceled',
        canceled_by: 'testing_dashboard',
        cancellation_reason: cancellation_reason.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', appointment.id)

    if (updateError) {
      throw new Error(`Failed to cancel appointment: ${updateError.message}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Appointment canceled successfully',
      appointment_id: appointment.id,
      user_id: appointment.user_id,
      appointment_type: appointment.type
    })
  } catch (error) {
    console.error('Error canceling appointment:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
