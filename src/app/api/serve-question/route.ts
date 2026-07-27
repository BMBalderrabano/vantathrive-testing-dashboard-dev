import { NextRequest, NextResponse } from 'next/server'

interface ServeQuestionRequest {
  testing: boolean
  response?: 'YES' | 'NO'
  user_id?: string // For testing mode
}

export async function POST(request: NextRequest) {
  try {
    const { testing, response, user_id }: ServeQuestionRequest = await request.json()

    if (testing === undefined || testing === null) {
      return NextResponse.json({
        error: 'testing parameter is required'
      }, { status: 400 })
    }

    // Validate response if provided
    if (response && !['YES', 'NO'].includes(response)) {
      return NextResponse.json({
        error: 'Response must be either "YES" or "NO"'
      }, { status: 400 })
    }

    // Get the authorization header from the request (user's session token)
    const authHeader = request.headers.get('Authorization')
    
    // If no auth header, use service role for testing
    const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/serve_question`
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    const authorizationHeader = authHeader || `Bearer ${serviceRoleKey}`

    const response_body = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': authorizationHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ testing, response, user_id })
    })

    const data = await response_body.json()

    return NextResponse.json(data, { status: response_body.status })
  } catch (error) {
    console.error('Error calling serve_question function:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
