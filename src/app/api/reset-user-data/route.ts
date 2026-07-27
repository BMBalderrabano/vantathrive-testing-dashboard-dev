import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/service-role'

interface ResetUserDataRequest {
  user_id?: string
  hard_reset?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const { user_id, hard_reset = false }: ResetUserDataRequest = await request.json()

    // Call the reset_user_data function
    const { data, error } = await supabaseAdmin.rpc('reset_user_data', {
      hard_reset,
      user_id_param: user_id ?? undefined,
    })

    if (error) {
      throw new Error(`Failed to reset user data: ${error.message}`)
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error resetting user data:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
