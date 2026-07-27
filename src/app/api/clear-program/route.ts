import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/service-role'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id } = body as { user_id?: string }

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: 'user_id is required' },
        { status: 400 },
      )
    }

    const { data: activeAssignments, error: fetchError } = await supabaseAdmin
      .from('program_assignment')
      .select('id, status, program_template_id')
      .eq('user_id', user_id)
      .in('status', ['active', 'pre_program'])

    if (fetchError) {
      console.error('Error fetching program assignments:', fetchError)
      return NextResponse.json(
        { success: false, error: fetchError.message },
        { status: 500 },
      )
    }

    if (!activeAssignments || activeAssignments.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active program assignment found for user.',
        deleted: 0,
      })
    }

    let deleted = 0
    const errors: string[] = []

    for (const assignment of activeAssignments) {
      const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc(
        'delete_program',
        { p_program_assignment_id: assignment.id },
      )

      if (rpcError) {
        console.error(
          `delete_program RPC failed for ${assignment.id}:`,
          rpcError,
        )
        const { error: directDeleteError } = await supabaseAdmin
          .from('program_assignment')
          .delete()
          .eq('id', assignment.id)

        if (directDeleteError) {
          errors.push(
            `${assignment.id}: ${rpcError.message}; fallback: ${directDeleteError.message}`,
          )
          continue
        }
      }

      deleted += 1
      if (rpcResult && typeof rpcResult === 'object' && 'error' in rpcResult) {
        const rpcObj = rpcResult as { error?: string }
        if (rpcObj.error) {
          errors.push(`${assignment.id}: ${rpcObj.error}`)
        }
      }
    }

    await supabaseAdmin
      .from('profiles')
      .update({
        program_assigned: false,
        program_started: false,
        program_due_date: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user_id)

    if (errors.length > 0 && deleted === 0) {
      return NextResponse.json(
        {
          success: false,
          error: errors.join('; '),
          deleted,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      message: `Cleared ${deleted} program assignment(s) for user.`,
      deleted,
      warnings: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Unexpected error in clear-program:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    )
  }
}
