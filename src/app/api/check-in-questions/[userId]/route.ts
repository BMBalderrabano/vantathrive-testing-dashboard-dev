import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdminLegacy as supabaseAdmin } from '@/lib/supabase/service-role'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const { data, error } = await supabaseAdmin
      .from('ip_check_in_questions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch check-in questions: ${error.message}`)
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching user check-in questions:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
