import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/service-role'

export async function GET() {
  try {
    // Get users without empowerment threshold initially
    const { data, error } = await supabaseAdmin
      .from('profiles_with_stats')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`)
    }

    // Get empowerment threshold titles separately
    const { data: thresholds, error: thresholdError } = await supabaseAdmin
      .from('empowerment_threshold')
      .select('id, title')

    if (thresholdError) {
      console.warn('Failed to fetch empowerment thresholds:', thresholdError)
    }

    // Create a map of threshold ID to title
    const thresholdMap = new Map()
    if (thresholds) {
      thresholds.forEach(threshold => {
        thresholdMap.set(threshold.id, threshold.title)
      })
    }

    // Transform the data to include empowerment_threshold_title
    const transformedData = (data || []).map(user => ({
      ...user,
      empowerment_threshold_title: user.empowerment_threshold ? thresholdMap.get(user.empowerment_threshold) || null : null
    }))

    return NextResponse.json(transformedData)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
