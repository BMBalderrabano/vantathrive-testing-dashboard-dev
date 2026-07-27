import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdminLegacy as supabase } from '@/lib/supabase/service-role'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params

    // Fetch workouts for the user
    const { data: workouts, error: workoutsError } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (workoutsError) {
      console.error('Error fetching workouts:', workoutsError)
      return NextResponse.json({ error: workoutsError.message }, { status: 500 })
    }

    if (!workouts || workouts.length === 0) {
      return NextResponse.json([])
    }

    // Get unique exercise IDs
    const exerciseIds = [...new Set(workouts.map(w => w.exercise_id).filter(Boolean))]
    
    if (exerciseIds.length === 0) {
      return NextResponse.json(workouts)
    }

    // Fetch exercises
    const { data: exercises, error: exercisesError } = await supabase
      .from('exercises')
      .select('id, exercise_name, type, matched_library_exercise_name, match_score, library_tip, library_check_in_question')
      .in('id', exerciseIds)

    if (exercisesError) {
      console.error('Error fetching exercises:', exercisesError)
      return NextResponse.json({ error: exercisesError.message }, { status: 500 })
    }

    // Create exercise map
    const exerciseMap = new Map(exercises?.map(ex => [ex.id, ex]) || [])

    // Map workouts with exercise data
    const workoutsWithExercises = workouts.map(workout => ({
      ...workout,
      exercises: exerciseMap.get(workout.exercise_id) || null
    }))

    return NextResponse.json(workoutsWithExercises)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}