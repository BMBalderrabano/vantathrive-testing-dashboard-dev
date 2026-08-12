import { 
  AdvanceTimeResponse, 
  User, 
  HpTransaction, 
  MarkAsAttendedResponse,
  ForceInsertAppointmentRequest,
  ForceInsertAppointmentResponse,
  ForceDeleteAppointmentResponse,
  CancelAppointmentRequest,
  CancelAppointmentResponse,
  RescheduleAppointmentRequest,
  RescheduleAppointmentResponse,
  AddChosenOneRequest,
  AddChosenOneResponse,
  ProgramAssignmentRequest,
  ProgramAssignmentResponse,
  AssignProgramOptionsResponse,
  ReminderPreferences,
  ReminderPreferencesResponse,
  UpdateReminderPreferencesRequest
} from './types'
import type { TalonEventType } from './talon-constants'

export {
  TALON_EVENT_TYPES,
  type TalonEventType,
} from './talon-constants'

export interface ServeQuestionRequest {
  testing: boolean
  response?: 'YES' | 'NO'
}

export interface ServeQuestionResponse {
  success?: boolean
  error?: string
  [key: string]: unknown // Allow any other properties from the response
}

export interface ProcessHabitRequest {
  response?: 'yes' | 'no' | 'confirmed'
  user_id?: string
}

export interface ProcessHabitResponse {
  success?: boolean
  error?: string
  [key: string]: unknown // Allow any other properties from the response
}

export interface TrackTalonEventResult {
  status: number
  body: unknown
}

export interface ResetUserDataRequest {
  user_id?: string
  hard_reset?: boolean
}

export interface ResetUserDataPushfireStatus {
  queued?: boolean
  skipped?: boolean
  reason?: string
  warning?: string
  message_id?: number
}

export interface ResetUserDataResponse {
  success?: boolean
  error?: string
  hard_reset?: boolean
  user_id?: string
  user_email?: string
  message?: string
  pushfire?: ResetUserDataPushfireStatus
}

export async function advanceTime(
  userId: string,
  hours: number,
  userLoggedIn: boolean = false,
  processWorkouts: boolean = false
): Promise<AdvanceTimeResponse> {
  const response = await fetch('/api/advance-time', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: userId,
      hours,
      user_logged_in: userLoggedIn,
      process_workouts: processWorkouts,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export interface Organization {
  id: string
  name: string
  created_at: string
}

export async function getUsers(): Promise<User[]> {
  const response = await fetch('/api/users')

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export async function getOrganizations(): Promise<Organization[]> {
  const response = await fetch('/api/organization')

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || `HTTP error! status: ${response.status}`)
  }

  const data = await response.json()
  return Array.isArray(data) ? data : []
}

export async function getUserTransactions(userId: string): Promise<HpTransaction[]> {
  const response = await fetch(`/api/transactions/${userId}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export async function markAppointmentAsAttended(appointmentId: number): Promise<MarkAsAttendedResponse> {
  const response = await fetch(`/api/appointments/mark-attended`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ appointmentId })
  })

  if (!response.ok) {
    // Check if response is JSON or HTML
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      const error = await response.json()
      throw new Error(error.error || `HTTP error! status: ${response.status}`)
    } else {
      // If it's HTML (like a 404 page), throw a more helpful error
      const text = await response.text()
      console.error('Non-JSON response:', text.substring(0, 200))
      throw new Error(`API route not found. Status: ${response.status}. Check if the route exists.`)
    }
  }

  return response.json()
}

export async function forceInsertAppointment(
  request: ForceInsertAppointmentRequest
): Promise<ForceInsertAppointmentResponse> {
  const response = await fetch('/api/appointments/force-insert', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export async function forceDeleteAppointment(
  appointmentId: number
): Promise<ForceDeleteAppointmentResponse> {
  const response = await fetch('/api/appointments/force-delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ appointmentId })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export async function cancelAppointment(
  request: CancelAppointmentRequest
): Promise<CancelAppointmentResponse> {
  const response = await fetch('/api/appointments/cancel', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export async function rescheduleAppointment(
  request: RescheduleAppointmentRequest
): Promise<RescheduleAppointmentResponse> {
  const response = await fetch('/api/appointments/reschedule', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export async function serveQuestion(
  testing: boolean,
  response?: 'YES' | 'NO',
  user_id?: string
): Promise<ServeQuestionResponse> {
  const response_body = await fetch('/api/serve-question', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ testing, response, user_id }),
  })

  if (!response_body.ok) {
    // Check if response is JSON or HTML
    const contentType = response_body.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      const error = await response_body.json()
      throw new Error(error.error || `HTTP error! status: ${response_body.status}`)
    } else {
      // If it's HTML (like a 404 page), throw a more helpful error
      const text = await response_body.text()
      console.error('Non-JSON response:', text.substring(0, 200))
      throw new Error(`API route not found. Status: ${response_body.status}. Check if the route exists.`)
    }
  }

  return response_body.json()
}

export async function processHabit(
  response?: 'yes' | 'no' | 'confirmed',
  user_id?: string
): Promise<ProcessHabitResponse> {
  const response_body = await fetch('/api/process-habit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ response, user_id }),
  })

  if (!response_body.ok) {
    // Check if response is JSON or HTML
    const contentType = response_body.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      const error = await response_body.json()
      throw new Error(error.error || `HTTP error! status: ${response_body.status}`)
    } else {
      // If it's HTML (like a 404 page), throw a more helpful error
      const text = await response_body.text()
      console.error('Non-JSON response:', text.substring(0, 200))
      throw new Error(`API route not found. Status: ${response_body.status}. Check if the route exists.`)
    }
  }

  return response_body.json()
}

export async function trackTalonEvent(
  profileId: string,
  type: TalonEventType,
  options?: { advanceWeek?: boolean },
): Promise<TrackTalonEventResult> {
  let response: Response
  try {
    response = await fetch('/api/talon/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        profileId,
        type,
        ...(type === 'qa_advance_time' && options?.advanceWeek
          ? { advanceWeek: true }
          : {}),
      }),
    })
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : 'Network error calling Talon events API'
    )
  }

  const contentType = response.headers.get('content-type')
  if (contentType && contentType.includes('application/json')) {
    const body = await response.json()
    return { status: response.status, body }
  }

  const text = await response.text()
  return { status: response.status, body: text }
}

export async function resetUserData(
  user_id?: string,
  hard_reset: boolean = false
): Promise<ResetUserDataResponse> {
  const response_body = await fetch('/api/reset-user-data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_id, hard_reset }),
  })

  if (!response_body.ok) {
    // Check if response is JSON or HTML
    const contentType = response_body.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      const error = await response_body.json()
      throw new Error(error.error || `HTTP error! status: ${response_body.status}`)
    } else {
      // If it's HTML (like a 404 page), throw a more helpful error
      const text = await response_body.text()
      console.error('Non-JSON response:', text.substring(0, 200))
      throw new Error(`API route not found. Status: ${response_body.status}. Check if the route exists.`)
    }
  }

  return response_body.json()
}

export async function addChosenOne(data: AddChosenOneRequest): Promise<AddChosenOneResponse> {
  const response = await fetch('/api/chosen-ones', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export async function getAssignProgramOptions(
  params?: { organizationId?: string | null; userId?: string }
): Promise<AssignProgramOptionsResponse> {
  const searchParams = new URLSearchParams()
  if (params?.organizationId) {
    searchParams.set('organization_id', params.organizationId)
  }
  if (params?.userId) {
    searchParams.set('user_id', params.userId)
  }
  const query = searchParams.toString()
  const response = await fetch(`/api/assign-program${query ? `?${query}` : ''}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export async function assignProgram(data: ProgramAssignmentRequest): Promise<ProgramAssignmentResponse> {
  const response = await fetch('/api/assign-program', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export async function clearProgram(user_id: string): Promise<{ success: boolean; message?: string; error?: string; deleted?: number; warnings?: string[] }> {
  const response = await fetch('/api/clear-program', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_id }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export async function getReminderPreferences(userId: string): Promise<ReminderPreferences | null> {
  const response = await fetch(`/api/reminder-preferences/${userId}`)

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || `HTTP error! status: ${response.status}`)
  }

  const result: ReminderPreferencesResponse = await response.json()
  return result.data || null
}

export async function updateReminderPreferences(
  userId: string,
  preferences: UpdateReminderPreferencesRequest
): Promise<ReminderPreferencesResponse> {
  const response = await fetch(`/api/reminder-preferences/${userId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(preferences),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}