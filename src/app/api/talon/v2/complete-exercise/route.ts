import { NextRequest, NextResponse } from 'next/server'

import { supabaseAdmin } from '@/lib/supabase/service-role'
import {
  buildExerciseExternalSessionId,
  loadProfileTimezone,
  postTalonEvent,
} from '@/lib/talon-client'
import {
  getEndOfWeekUtc,
  getLocalDateString,
  resolveTimezone,
} from '@/lib/talon-time'

type ServeExercise = {
  id: number
  exercise_name?: string | null
  set_amount?: number | null
  is_completed?: boolean
}

type ServeDailyWorkout = {
  success?: boolean
  error?: string
  message?: string
  is_rest?: boolean
  last_set_index?: number
  is_complete?: boolean
  exercises?: ServeExercise[]
}

function asServe(data: unknown): ServeDailyWorkout {
  if (!data || typeof data !== 'object') return {}
  return data as ServeDailyWorkout
}

function exerciseId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value)
  return null
}

async function serveToday(
  profileId: string,
  localDate: string,
): Promise<ServeDailyWorkout> {
  const { data, error } = await supabaseAdmin.rpc('serve_daily_workout', {
    p_user_id: profileId,
    p_date: localDate,
  })
  if (error) {
    throw new Error(error.message)
  }
  return asServe(data)
}

function incompleteExercises(served: ServeDailyWorkout): Array<{
  exerciseId: number
  name: string
  setAmount: number
}> {
  if (served.is_rest) return []
  const list = Array.isArray(served.exercises) ? served.exercises : []
  const out: Array<{ exerciseId: number; name: string; setAmount: number }> = []
  for (const row of list) {
    const id = exerciseId(row?.id)
    if (id === null) continue
    if (row.is_completed === true) continue
    out.push({
      exerciseId: id,
      name: row.exercise_name?.trim() || `Exercise ${id}`,
      setAmount: Number(row.set_amount) || 0,
    })
  }
  return out
}

/** Sets still needed on complete_set to finish `exerciseId` (includes earlier incomplete sets). */
function remainingSetsThroughExercise(
  served: ServeDailyWorkout,
  targetId: number,
): number | null {
  const list = Array.isArray(served.exercises) ? served.exercises : []
  let end = 0
  let found = false
  for (const row of list) {
    const id = exerciseId(row?.id)
    const sets = Number(row?.set_amount) || 0
    end += sets
    if (id === targetId) {
      found = true
      break
    }
  }
  if (!found) return null
  const last = Number(served.last_set_index) || 0
  return Math.max(0, end - last)
}

async function completeSets(
  profileId: string,
  localDate: string,
  count: number,
): Promise<number> {
  for (let i = 0; i < count; i += 1) {
    const { data, error } = await supabaseAdmin.rpc('complete_set', {
      p_user_id: profileId,
      p_date: localDate,
    })
    if (error) {
      throw new Error(error.message)
    }
    const body = asServe(data)
    if (body.success === false) {
      throw new Error(body.message || body.error || 'complete_set failed')
    }
  }
  return count
}

export async function GET(request: NextRequest) {
  try {
    const profileId = request.nextUrl.searchParams.get('profileId')
    if (!profileId) {
      return NextResponse.json(
        { error: 'profileId query param is required' },
        { status: 400 },
      )
    }

    const timezone = await loadProfileTimezone(profileId)
    const resolvedTimezone = resolveTimezone(timezone)
    const localDate = getLocalDateString(timezone)
    const served = await serveToday(profileId, localDate)

    if (served.success === false) {
      return NextResponse.json({
        localDate,
        timezone: resolvedTimezone,
        exercises: [],
        detail: served.message || served.error || 'serve_daily_workout failed',
      })
    }

    const exercises = incompleteExercises(served)
    let detail: string | undefined
    if (served.is_rest) {
      detail = 'Rest day — no exercises scheduled'
    } else if (exercises.length === 0) {
      detail = 'No incomplete exercises today'
    }

    return NextResponse.json({
      localDate,
      timezone: resolvedTimezone,
      exercises,
      detail,
    })
  } catch (error) {
    console.error('V2 today-exercises GET error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const profileId = body.profileId as string | undefined
    const exerciseIdValue = body.exerciseId as number | undefined

    if (typeof profileId !== 'string' || profileId.trim() === '') {
      return NextResponse.json(
        { error: 'profileId must be a non-empty string' },
        { status: 400 },
      )
    }
    if (typeof exerciseIdValue !== 'number' || !Number.isFinite(exerciseIdValue)) {
      return NextResponse.json(
        { error: 'exerciseId must be a finite number' },
        { status: 400 },
      )
    }

    const timezone = await loadProfileTimezone(profileId)
    const localDate = getLocalDateString(timezone)
    const before = await serveToday(profileId, localDate)

    if (before.success === false) {
      return NextResponse.json(
        { error: before.message || before.error || 'serve_daily_workout failed' },
        { status: 400 },
      )
    }

    const incompleteBefore = incompleteExercises(before)
    if (!incompleteBefore.some((e) => e.exerciseId === exerciseIdValue)) {
      return NextResponse.json(
        {
          error: `Exercise ${exerciseIdValue} is not an incomplete exercise for ${localDate}`,
        },
        { status: 400 },
      )
    }

    const remaining = remainingSetsThroughExercise(before, exerciseIdValue)
    if (remaining === null || remaining === 0) {
      return NextResponse.json(
        {
          error: `No remaining sets to complete for exercise ${exerciseIdValue} on ${localDate}`,
        },
        { status: 400 },
      )
    }

    const completedSets = await completeSets(profileId, localDate, remaining)
    const after = await serveToday(profileId, localDate)
    const incompleteAfter = incompleteExercises(after)
    if (incompleteAfter.some((e) => e.exerciseId === exerciseIdValue)) {
      return NextResponse.json(
        {
          error: `Exercise ${exerciseIdValue} still incomplete after complete_set`,
          db: { completedSets, localDate, remaining },
        },
        { status: 500 },
      )
    }

    const isDayComplete = incompleteAfter.length === 0
    const endOfWeek = getEndOfWeekUtc(timezone)
    const externalSessionID = buildExerciseExternalSessionId(exerciseIdValue)
    const attributes = {
      exerciseCompleted: true,
      isDayComplete,
      endOfWeek,
      externalSessionID,
    }

    const talonResult = await postTalonEvent({
      profileId,
      type: 'exercise_completed',
      attributes,
      app: 'v2',
    })

    if (talonResult.skipped) {
      return NextResponse.json(
        {
          error: talonResult.reason,
          db: { completedSets, localDate, isDayComplete },
        },
        { status: 500 },
      )
    }

    if ((talonResult.status ?? 500) >= 400) {
      return NextResponse.json(
        {
          error: 'Talon V2 exercise_completed failed after DB mark',
          db: { completedSets, localDate, isDayComplete },
          talon: talonResult.body,
          attributes,
        },
        { status: talonResult.status ?? 502 },
      )
    }

    return NextResponse.json({
      success: true,
      db: { completedSets, localDate, isDayComplete },
      attributes,
      talon: talonResult.body,
      status: talonResult.status,
    })
  } catch (error) {
    console.error('V2 complete-exercise POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
