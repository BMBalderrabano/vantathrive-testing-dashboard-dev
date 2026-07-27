import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/service-role'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    const { userId } = await params

    try {

        const { data, error } = await supabaseAdmin
            .from('appointments')
            .select('*')
            .eq('user_id', userId)
            .order('start_time', { ascending: false })

        if (error) {
            throw new Error(`Failed to fetch appointments for user ${userId}: ${error.message}`)
        }

        return NextResponse.json(data)
    } catch (error) {
        console.error(`Error fetching appointments for user ${userId}:`, error)
        return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
    }
}
