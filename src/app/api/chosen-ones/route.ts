import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/service-role'

function randomPassword(length = 24): string {
  const chars =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export async function POST(request: NextRequest) {
  try {
    const { email, first_name, last_name, organization_id, password } =
      await request.json()

    if (!email || !first_name || !last_name) {
      return NextResponse.json(
        { error: 'Email, first name, and last name are required' },
        { status: 400 },
      )
    }

    const normalizedEmail = String(email).toLowerCase().trim()

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 })
    }

    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: password || randomPassword(),
        user_metadata: {
          first_name: String(first_name).trim(),
          last_name: String(last_name).trim(),
        },
        email_confirm: true,
      })

    if (authError || !authUser.user) {
      console.error('Error creating auth user:', authError)
      return NextResponse.json(
        { error: authError?.message || 'Failed to create auth user' },
        { status: 500 },
      )
    }

    const userId = authUser.user.id

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        email: normalizedEmail,
        first_name: String(first_name).trim() || null,
        last_name: String(last_name).trim() || null,
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (profileError) {
      console.error('Error updating profile:', profileError)
      return NextResponse.json(
        { error: `Failed to update profile: ${profileError.message}` },
        { status: 500 },
      )
    }

    if (organization_id) {
      const { error: orgError } = await supabaseAdmin
        .from('organization_members')
        .insert({
          organization_id,
          user_id: userId,
          role: 'patient',
          is_active: true,
        })

      if (orgError) {
        console.error('Error adding org membership:', orgError)
        return NextResponse.json(
          { error: `Failed to add user to organization: ${orgError.message}` },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Chosen One added successfully',
      data: {
        id: userId,
        email: normalizedEmail,
        first_name: String(first_name).trim(),
        last_name: String(last_name).trim(),
        organization_id: organization_id ?? null,
      },
    })
  } catch (error) {
    console.error('Error in chosen-ones API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
