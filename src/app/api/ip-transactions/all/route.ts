import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/service-role'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('ip_transactions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch all IP transactions: ${error.message}`)
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching all IP transactions:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
