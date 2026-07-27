import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/service-role'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .order('start_time', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch all appointments: ${error.message}`)
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching all appointments:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
