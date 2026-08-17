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
import type { TalonEventType, TalonV2EventType } from './talon-constants'

export {
  TALON_EVENT_TYPES,
  TALON_V2_EVENT_TYPES,
  TALON_V2_CAMPAIGN_LABELS,
  type TalonEventType,
  type TalonV2EventType,
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
  processWorkouts: boolean = false,
  options?: { skipTalonSoftFire?: boolean },
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
      ...(options?.skipTalonSoftFire ? { skipTalonSoftFire: true } : {}),
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

export async function trackTalonV2Event(
  profileId: string,
  type: TalonV2EventType,
  extra?: Record<string, unknown>,
): Promise<TrackTalonEventResult> {
  let response: Response
  try {
    response = await fetch('/api/talon/v2/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId, type, ...extra }),
    })
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : 'Network error calling Talon V2 events API',
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

export interface TalonV2TodayExercise {
  exerciseId: number
  name: string
}

export async function getTalonV2TodayExercises(
  profileId: string,
): Promise<{
  localDate: string
  timezone: string
  exercises: TalonV2TodayExercise[]
}> {
  const response = await fetch(
    `/api/talon/v2/complete-exercise?profileId=${encodeURIComponent(profileId)}`,
  )
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(
      (body as { error?: string }).error ||
        `HTTP error! status: ${response.status}`,
    )
  }
  return body
}

export async function completeExerciseV2(
  profileId: string,
  exerciseId: number,
): Promise<TrackTalonEventResult> {
  const response = await fetch('/api/talon/v2/complete-exercise', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profileId, exerciseId }),
  })
  const body = await response.json().catch(() => ({}))
  return { status: response.status, body }
}

export async function assignProgramV2(
  profileId: string,
  options?: { program_template_id?: string; organization_id?: string },
): Promise<TrackTalonEventResult> {
  const response = await fetch('/api/talon/v2/assign-program', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profileId,
      program_template_id: options?.program_template_id,
      organization_id: options?.organization_id,
    }),
  })
  const body = await response.json().catch(() => ({}))
  return { status: response.status, body }
}

/** Advance Supabase 168h (skip V1 soft-fire) then fire V2 qa_advance_time day+week. */
export async function advanceTimeV2(
  profileId: string,
): Promise<TrackTalonEventResult> {
  try {
    await advanceTime(profileId, 168, false, false, {
      skipTalonSoftFire: true,
    })
  } catch (error) {
    return {
      status: 0,
      body: {
        error:
          error instanceof Error
            ? error.message
            : 'Advance time failed; Talon V2 not called',
      },
    }
  }

  return trackTalonV2Event(profileId, 'qa_advance_time')
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