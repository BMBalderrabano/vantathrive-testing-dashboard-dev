import { NextResponse } from 'next/server'
import { supabaseAdminLegacy as supabaseAdmin } from '@/lib/supabase/service-role'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('ip_check_in_questions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch all check-in questions: ${error.message}`)
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching all check-in questions:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
