import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/service-role'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('hp_transactions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch all transactions: ${error.message}`)
    }

    return NextResponse.json(data || [])
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
