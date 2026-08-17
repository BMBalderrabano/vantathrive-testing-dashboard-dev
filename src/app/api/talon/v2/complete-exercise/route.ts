import { NextRequest, NextResponse } from 'next/server'

import { supabaseAdminLegacy as supabaseAdmin } from '@/lib/supabase/service-role'
import {
  buildExerciseExternalSessionId,
  loadProfileTimezone,
  postTalonEvent,
} from '@/lib/talon-client'
import {
  getEndOfWeekUtc,
  getLocalDateString,
} from '@/lib/talon-time'

type WorkoutRow = {
  exercise_id: number | null
  status: string | null
  workout_date: string | null
}

async function loadTodayWorkouts(
  profileId: string,
  localDate: string,
): Promise<WorkoutRow[]> {
  const { data, error } = await supabaseAdmin
    .from('workouts')
    .select('exercise_id, status, workout_date')
    .eq('user_id', profileId)
    .eq('workout_date', localDate)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as WorkoutRow[]
}

function uniqueExerciseIds(rows: WorkoutRow[]): number[] {
  const ids = new Set<number>()
  for (const row of rows) {
    if (typeof row.exercise_id === 'number') ids.add(row.exercise_id)
  }
  return [...ids]
}

function incompleteExerciseIds(rows: WorkoutRow[]): number[] {
  const byExercise = new Map<number, { anyIncomplete: boolean }>()
  for (const row of rows) {
    if (typeof row.exercise_id !== 'number') continue
    const entry = byExercise.get(row.exercise_id) ?? { anyIncomplete: false }
    if (row.status !== 'completed') entry.anyIncomplete = true
    byExercise.set(row.exercise_id, entry)
  }
  return [...byExercise.entries()]
    .filter(([, v]) => v.anyIncomplete)
    .map(([id]) => id)
}

/**
 * Mirrors test_mark_exercise_as_completed for a target profile.
 * The RPC uses auth.uid(); service_role must update by user_id instead.
 */
async function markExerciseCompleted(
  profileId: string,
  exerciseId: number,
  localDate: string,
): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('workouts')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('user_id', profileId)
    .eq('workout_date', localDate)
    .eq('exercise_id', exerciseId)
    .select('id')

  if (error) {
    throw new Error(error.message)
  }

  return data?.length ?? 0
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
    const localDate = getLocalDateString(timezone)
    const rows = await loadTodayWorkouts(profileId, localDate)
    const incompleteIds = incompleteExerciseIds(rows)

    const exerciseIds = uniqueExerciseIds(rows)
    let names = new Map<number, string>()
    if (exerciseIds.length > 0) {
      const { data: exercises } = await supabaseAdmin
        .from('exercises')
        .select('id, exercise_name')
        .in('id', exerciseIds)
      names = new Map(
        (exercises ?? []).map((e: { id: number; exercise_name: string | null }) => [
          e.id,
          e.exercise_name ?? `Exercise ${e.id}`,
        ]),
      )
    }

    return NextResponse.json({
      localDate,
      timezone: timezone ?? 'UTC',
      exercises: incompleteIds.map((id) => ({
        exerciseId: id,
        name: names.get(id) ?? `Exercise ${id}`,
      })),
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
    const exerciseId = body.exerciseId as number | undefined

    if (typeof profileId !== 'string' || profileId.trim() === '') {
      return NextResponse.json(
        { error: 'profileId must be a non-empty string' },
        { status: 400 },
      )
    }
    if (typeof exerciseId !== 'number' || !Number.isFinite(exerciseId)) {
      return NextResponse.json(
        { error: 'exerciseId must be a finite number' },
        { status: 400 },
      )
    }

    const timezone = await loadProfileTimezone(profileId)
    const localDate = getLocalDateString(timezone)
    const beforeRows = await loadTodayWorkouts(profileId, localDate)
    const incompleteBefore = incompleteExerciseIds(beforeRows)

    if (!incompleteBefore.includes(exerciseId)) {
      return NextResponse.json(
        {
          error: `Exercise ${exerciseId} is not an incomplete exercise for ${localDate}`,
        },
        { status: 400 },
      )
    }

    const updatedRows = await markExerciseCompleted(
      profileId,
      exerciseId,
      localDate,
    )
    if (updatedRows === 0) {
      return NextResponse.json(
        {
          error: `No workout rows updated for exercise ${exerciseId} on ${localDate}`,
        },
        { status: 500 },
      )
    }

    const afterRows = await loadTodayWorkouts(profileId, localDate)
    const incompleteAfter = incompleteExerciseIds(afterRows)
    const isDayComplete = incompleteAfter.length === 0
    const endOfWeek = getEndOfWeekUtc(timezone)
    const externalSessionID = buildExerciseExternalSessionId(exerciseId)
    const attributes = {
      exercise_completed: true,
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
          db: { updatedRows, localDate, isDayComplete },
        },
        { status: 500 },
      )
    }

    if ((talonResult.status ?? 500) >= 400) {
      return NextResponse.json(
        {
          error: 'Talon V2 exercise_completed failed after DB mark',
          db: { updatedRows, localDate, isDayComplete },
          talon: talonResult.body,
          attributes,
        },
        { status: talonResult.status ?? 502 },
      )
    }

    return NextResponse.json({
      success: true,
      db: { updatedRows, localDate, isDayComplete },
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
