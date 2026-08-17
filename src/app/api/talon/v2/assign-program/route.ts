import { NextRequest, NextResponse } from 'next/server'

import { supabaseAdmin } from '@/lib/supabase/service-role'
import { loadProfileTimezone, postTalonEvent } from '@/lib/talon-client'
import {
  getStartOfWeekDateString,
  programStartDateToTalonUtc,
} from '@/lib/talon-time'

/**
 * V2 Assign Program orchestration:
 * - If active assignment exists → Talon-only program_change with its start_date
 * - Else → require program_template_id, assign via internal assign-program logic
 *   with Monday start (profile TZ), then fire V2 Talon
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const profileId = body.profileId as string | undefined
    const programTemplateId = body.program_template_id as string | undefined
    const organizationId = body.organization_id as string | undefined

    if (typeof profileId !== 'string' || profileId.trim() === '') {
      return NextResponse.json(
        { error: 'profileId must be a non-empty string' },
        { status: 400 },
      )
    }

    const { data: active, error: activeError } = await supabaseAdmin
      .from('program_assignment')
      .select(
        `
        id,
        program_template_id,
        start_date,
        end_date,
        status,
        program_template ( id, name, weeks )
      `,
      )
      .eq('user_id', profileId)
      .eq('status', 'active')
      .maybeSingle()

    if (activeError) {
      return NextResponse.json({ error: activeError.message }, { status: 500 })
    }

    let startDate: string
    let assigned = false
    let assignResult: unknown = null

    if (active?.start_date) {
      startDate = String(active.start_date).slice(0, 10)
    } else {
      if (
        typeof programTemplateId !== 'string' ||
        programTemplateId.trim() === ''
      ) {
        return NextResponse.json(
          {
            error:
              'No active assignment; program_template_id is required to assign',
            needsAssign: true,
          },
          { status: 400 },
        )
      }

      const timezone = await loadProfileTimezone(profileId)
      startDate = getStartOfWeekDateString(timezone)

      const origin = request.nextUrl.origin
      const assignResponse = await fetch(`${origin}/api/assign-program`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: profileId,
          program_template_id: programTemplateId,
          start_date: startDate,
          organization_id: organizationId,
        }),
      })

      const assignBody = await assignResponse.json().catch(() => ({}))
      if (!assignResponse.ok) {
        return NextResponse.json(
          {
            error:
              (assignBody as { error?: string }).error ||
              `assign-program failed (${assignResponse.status})`,
            assign: assignBody,
          },
          { status: assignResponse.status >= 400 ? assignResponse.status : 500 },
        )
      }

      assigned = true
      assignResult = assignBody
      const assignedStart = (assignBody as { assignment?: { start_date?: string } })
        .assignment?.start_date
      if (assignedStart) {
        startDate = String(assignedStart).slice(0, 10)
      }
    }

    const programStartDate = programStartDateToTalonUtc(startDate)
    const attributes = {
      program_change: true,
      programStartDate,
    }

    const talonResult = await postTalonEvent({
      profileId,
      type: 'program_change',
      attributes,
      app: 'v2',
    })

    if (talonResult.skipped) {
      return NextResponse.json(
        {
          error: talonResult.reason,
          assigned,
          startDate,
          assign: assignResult,
        },
        { status: 500 },
      )
    }

    if ((talonResult.status ?? 500) >= 400) {
      return NextResponse.json(
        {
          error: 'Talon V2 program_change failed',
          assigned,
          startDate,
          assign: assignResult,
          attributes,
          talon: talonResult.body,
        },
        { status: talonResult.status ?? 502 },
      )
    }

    return NextResponse.json({
      success: true,
      assigned,
      startDate,
      attributes,
      assign: assignResult,
      activeAssignment: active,
      talon: talonResult.body,
      status: talonResult.status,
    })
  } catch (error) {
    console.error('V2 assign-program POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
