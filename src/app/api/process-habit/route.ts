import { NextRequest, NextResponse } from 'next/server'

interface ProcessHabitRequest {
  response?: 'yes' | 'no' | 'confirmed'
  user_id?: string
}

export async function POST(request: NextRequest) {
  try {
    const { response, user_id }: ProcessHabitRequest = await request.json()

    // Validate response if provided
    if (response && !['yes', 'no', 'confirmed'].includes(response)) {
      return NextResponse.json({
        error: 'Response must be either "yes", "no", or "confirmed"'
      }, { status: 400 })
    }

    // Get the authorization header from the request (user's session token)
    const authHeader = request.headers.get('Authorization')
    
    // If no auth header, use service role for testing
    const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process_habit`
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    const authorizationHeader = authHeader || `Bearer ${serviceRoleKey}`

    const response_body = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': authorizationHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ response, user_id })
    })

    const data = await response_body.json()

    return NextResponse.json(data, { status: response_body.status })
  } catch (error) {
    console.error('Error calling process_habit function:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
