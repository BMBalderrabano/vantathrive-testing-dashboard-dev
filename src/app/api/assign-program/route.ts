import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/service-role'
import { calculateEndDate, formatDateForDB } from '@/lib/date-utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id')
    const userId = searchParams.get('user_id')

    let templatesQuery = supabaseAdmin
      .from('program_template')
      .select(
        `
        id,
        name,
        description,
        weeks,
        organization_id,
        active,
        created_at,
        organizations ( id, name )
      `,
      )
      .order('created_at', { ascending: false })

    if (organizationId) {
      templatesQuery = templatesQuery.eq('organization_id', organizationId)
    }

    const { data: templates, error: templatesError } = await templatesQuery

    if (templatesError) {
      return NextResponse.json({ error: templatesError.message }, { status: 500 })
    }

    const templateIds = (templates ?? []).map((t) => t.id)
    let templateAssignments: Array<{
      id: string
      program_template_id: string
      workout_schedule_id: string | null
      organization_id: string | null
    }> = []

    if (templateIds.length > 0) {
      const { data: assignments, error: assignmentsError } = await supabaseAdmin
        .from('program_assignment')
        .select('id, program_template_id, workout_schedule_id, organization_id')
        .in('program_template_id', templateIds)
        .eq('status', 'template')
        .is('user_id', null)

      if (assignmentsError) {
        return NextResponse.json(
          { error: assignmentsError.message },
          { status: 500 },
        )
      }

      templateAssignments = assignments ?? []
    }

    const assignmentByTemplateId = new Map(
      templateAssignments.map((a) => [a.program_template_id, a]),
    )

    const assignableTemplates = (templates ?? []).map((template) => {
      const templateAssignment = assignmentByTemplateId.get(template.id)
      const org = template.organizations as { id: string; name: string } | null
      return {
        ...template,
        organization_name: org?.name ?? null,
        template_assignment_id: templateAssignment?.id ?? null,
        has_template_assignment: Boolean(templateAssignment),
      }
    })

    let activeAssignment = null
    if (userId) {
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
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle()

      if (activeError) {
        return NextResponse.json({ error: activeError.message }, { status: 500 })
      }

      activeAssignment = active
    }

    return NextResponse.json({
      templates: assignableTemplates,
      active_assignment: activeAssignment,
    })
  } catch (error) {
    console.error('Unexpected error in assign-program GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, program_template_id, start_date, organization_id } = body

    if (!user_id || !program_template_id || !start_date) {
      return NextResponse.json(
        {
          error: 'user_id, program_template_id, and start_date are required',
        },
        { status: 400 },
      )
    }

    const { data: templateAssignment, error: templateError } = await supabaseAdmin
      .from('program_assignment')
      .select(
        `
        id,
        program_template_id,
        workout_schedule_id,
        organization_id,
        program_template ( id, name, weeks )
      `,
      )
      .eq('program_template_id', program_template_id)
      .eq('status', 'template')
      .is('user_id', null)
      .limit(1)
      .maybeSingle()

    if (templateError) {
      return NextResponse.json({ error: templateError.message }, { status: 500 })
    }

    if (!templateAssignment) {
      return NextResponse.json(
        {
          error:
            'No template assignment found for this program template. Create one in the program builder first.',
        },
        { status: 404 },
      )
    }

    const programTemplate = templateAssignment.program_template as {
      id: string
      name: string
      weeks: number
    } | null

    const { data: existingAssignment } = await supabaseAdmin
      .from('program_assignment')
      .select('id')
      .eq('user_id', user_id)
      .eq('program_template_id', program_template_id)
      .eq('status', 'active')
      .maybeSingle()

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'User already has an active assignment for this program' },
        { status: 409 },
      )
    }

    let userOrganizationId: string | null = organization_id ?? null

    if (!userOrganizationId) {
      const { data: orgMember, error: orgError } = await supabaseAdmin
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user_id)
        .eq('role', 'patient')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

      if (orgError) {
        return NextResponse.json({ error: orgError.message }, { status: 500 })
      }

      userOrganizationId = orgMember?.organization_id ?? null
    }

    if (!userOrganizationId) {
      userOrganizationId = templateAssignment.organization_id

      if (!userOrganizationId) {
        const { data: programTemplateRow } = await supabaseAdmin
          .from('program_template')
          .select('organization_id')
          .eq('id', program_template_id)
          .maybeSingle()

        userOrganizationId = programTemplateRow?.organization_id ?? null
      }
    }

    if (!userOrganizationId) {
      return NextResponse.json(
        {
          error:
            'User has no patient org membership. Add org membership when creating the user or pass organization_id.',
        },
        { status: 400 },
      )
    }

    const [year, month, day] = String(start_date).split('-').map(Number)
    const startDateObj = new Date(year, month - 1, day)
    const templateWeeks = programTemplate?.weeks ?? 0
    const calculatedEnd =
      templateWeeks >= 1
        ? calculateEndDate(startDateObj, templateWeeks)
        : undefined
    const endDate = formatDateForDB(calculatedEnd ?? startDateObj)

    const { data: created, error: insertError } = await supabaseAdmin
      .from('program_assignment')
      .insert({
        program_template_id,
        user_id,
        organization_id: userOrganizationId,
        workout_schedule_id: templateAssignment.workout_schedule_id,
        start_date,
        end_date: endDate,
        status: 'active',
        completion: null,
        patient_override: null,
        base: templateAssignment.id,
      })
      .select(
        `
        id,
        program_template_id,
        user_id,
        start_date,
        end_date,
        status,
        program_template ( id, name, weeks )
      `,
      )
      .single()

    if (insertError) {
      console.error('Error assigning program:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    await supabaseAdmin
      .from('profiles')
      .update({
        program_assigned: true,
        program_started: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user_id)

    return NextResponse.json({
      success: true,
      message: `Program "${programTemplate?.name ?? program_template_id}" assigned successfully`,
      assignment: created,
    })
  } catch (error) {
    console.error('Unexpected error in assign-program POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
