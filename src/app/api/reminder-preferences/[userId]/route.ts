import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/service-role'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Fetch reminder preferences for the user
    const { data, error } = await supabaseAdmin
      .from('reminder_user_config')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching reminder preferences:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || null
    })
  } catch (error) {
    console.error('Error in reminder-preferences GET API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const body = await request.json()
    const { mode, time_preference, is_enabled, timezone } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!mode || !time_preference || typeof is_enabled !== 'boolean' || !timezone) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: mode, time_preference, is_enabled, timezone' },
        { status: 400 }
      )
    }

    // Validate mode
    const validModes = ['SoftMode', 'FocusMode', 'BeastMode']
    if (!validModes.includes(mode)) {
      return NextResponse.json(
        { success: false, error: `Invalid mode. Must be one of: ${validModes.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate time_preference
    const validTimePreferences = ['morning', 'midday', 'afternoon', 'evening', 'vanta_choice']
    if (!validTimePreferences.includes(time_preference)) {
      return NextResponse.json(
        { success: false, error: `Invalid time_preference. Must be one of: ${validTimePreferences.join(', ')}` },
        { status: 400 }
      )
    }

    // Step 1: Update profile timezone first
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ timezone })
      .eq('id', userId)

    if (profileError) {
      console.error('Error updating profile timezone:', profileError)
      return NextResponse.json(
        { success: false, error: `Failed to update profile timezone: ${profileError.message}` },
        { status: 500 }
      )
    }

    // Step 2: Check if reminder_user_config exists for this user
    const { data: existingConfig, error: checkError } = await supabaseAdmin
      .from('reminder_user_config')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" which is fine
      console.error('Error checking existing reminder config:', checkError)
      return NextResponse.json(
        { success: false, error: `Failed to check existing config: ${checkError.message}` },
        { status: 500 }
      )
    }

    // Step 3: Insert or update reminder_user_config
    let result
    if (existingConfig) {
      // Update existing config
      const { data, error: updateError } = await supabaseAdmin
        .from('reminder_user_config')
        .update({
          mode,
          time_preference,
          is_enabled,
          timezone
        })
        .eq('user_id', userId)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating reminder config:', updateError)
        return NextResponse.json(
          { success: false, error: `Failed to update reminder config: ${updateError.message}` },
          { status: 500 }
        )
      }

      result = data
    } else {
      // Insert new config
      const { data, error: insertError } = await supabaseAdmin
        .from('reminder_user_config')
        .insert({
          user_id: userId,
          mode,
          time_preference,
          is_enabled,
          timezone
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error inserting reminder config:', insertError)
        return NextResponse.json(
          { success: false, error: `Failed to create reminder config: ${insertError.message}` },
          { status: 500 }
        )
      }

      result = data
    }

    return NextResponse.json({
      success: true,
      message: 'Reminder preferences saved successfully',
      data: result
    })
  } catch (error) {
    console.error('Error in reminder-preferences POST API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

