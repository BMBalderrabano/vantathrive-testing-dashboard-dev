export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  current_level: number
  hp_points: number
  empowerment: number
  current_phase: string
  max_gate_unlocked?: number
  max_gate_type?: string
  empowerment_threshold?: number
  empowerment_threshold_title?: string
}

export interface HpTransaction {
  id: string
  user_id: string
  points_earned: number
  transaction_type: string
  created_at: string
  description: string
}

export interface IpTransaction {
  id: string
  user_id: string
  amount: number
  transaction_type: string
  created_at: string
  metadata?: unknown
  check_in_question_id?: number
}

export interface CheckInQuestion {
  id: string
  user_id: string
  created_at: string
  question_text: string
}

export interface Appointment {
  id: number
  user_id: string
  calendly_uri: string
  event_uri?: string
  event_name?: string
  invitee_name?: string
  invitee_email?: string
  status: string
  type: string
  start_time?: string
  end_time?: string
  timezone?: string
  canceled_by?: string
  cancellation_reason?: string
  reschedule_url?: string
  cancel_url?: string
  location_type?: string
  location_value?: string
  raw_payload?: unknown
  created_at: string
}

export interface AdvanceTimeResponse {
  success: boolean
  user_id: string
  hours_advanced: number
  user_logged_in: boolean
  boundary_crossed: boolean
  results: Array<{
    table_name: string
    records_modified: number
    success: boolean
    error?: string
  }>
  total_records_modified: number
  cron_triggered: boolean
  message: string
}

export interface MarkAsAttendedResponse {
  success: boolean
  message?: string
  error?: string
  appointment_id?: number
  user_id?: string
  appointment_type?: string
}

export interface ForceInsertAppointmentRequest {
  user_id: string
  appointment_type: 'onboarding_screening' | 'onboarding_consultation'
  start_time: string
}

export interface ForceInsertAppointmentResponse {
  success: boolean
  message?: string
  error?: string
  appointment_id?: number
  user_id?: string
  appointment_type?: string
  start_time?: string
  end_time?: string
}

export interface ForceDeleteAppointmentResponse {
  success: boolean
  message?: string
  error?: string
  appointment_id?: number
  user_id?: string
  appointment_type?: string
}

export interface CancelAppointmentRequest {
  appointmentId: number
  cancellation_reason: string
}

export interface CancelAppointmentResponse {
  success: boolean
  message?: string
  error?: string
  appointment_id?: number
  user_id?: string
  appointment_type?: string
}

export interface RescheduleAppointmentRequest {
  user_id: string
  appointment_type: 'onboarding_screening' | 'onboarding_consultation'
  start_time: string
}

export interface RescheduleAppointmentResponse {
  success: boolean
  message?: string
  error?: string
  appointment_id?: number
  user_id?: string
  appointment_type?: string
  start_time?: string
  end_time?: string
  rows_marked_rescheduled?: number
}

export interface AddChosenOneRequest {
  email: string
  first_name: string
  last_name: string
  organization_id?: string
}

export interface CreatedUser {
  id: string
  email: string
  first_name: string
  last_name: string
  organization_id?: string | null
}

export interface Workout {
  id: number
  user_id: string
  exercise: string
  exercise_id: number
  workout_name?: string
  workout_date?: string
  workout_start_date?: string
  workout_end_date?: string
  status?: string
  created_at?: string
  updated_at: string
  set_type?: string
  set_id?: number
  assigned_reps?: number
  assigned_weight_lbs?: number
  assigned_time?: number
  note?: string
}

export interface AddChosenOneResponse {
  success: boolean
  message: string
  data: CreatedUser
  error?: string
}

export interface AssignableProgramTemplate {
  id: string
  name: string
  description?: string | null
  weeks: number
  organization_id?: string | null
  organization_name?: string | null
  active?: boolean | null
  template_assignment_id?: string | null
  has_template_assignment: boolean
}

export interface UserProgramAssignment {
  id: string
  program_template_id: string
  start_date?: string | null
  end_date?: string | null
  status?: string | null
  program_template?: {
    id: string
    name: string
    weeks: number
  } | null
}

export interface ProgramAssignmentRequest {
  user_id: string
  program_template_id: string
  start_date: string
  organization_id?: string
}

export interface ProgramAssignmentResponse {
  success: boolean
  message: string
  assignment?: UserProgramAssignment
  error?: string
}

export interface AssignProgramOptionsResponse {
  templates: AssignableProgramTemplate[]
  active_assignment: UserProgramAssignment | null
}

export interface ReminderPreferences {
  id?: string
  user_id: string
  mode: 'SoftMode' | 'FocusMode' | 'BeastMode'
  time_preference: 'morning' | 'midday' | 'afternoon' | 'evening' | 'vanta_choice'
  is_enabled: boolean
  timezone: string
  created_at?: string
  updated_at?: string
}

export interface ReminderPreferencesResponse {
  success: boolean
  data?: ReminderPreferences | null
  message?: string
  error?: string
}

export interface UpdateReminderPreferencesRequest {
  mode: 'SoftMode' | 'FocusMode' | 'BeastMode'
  time_preference: 'morning' | 'midday' | 'afternoon' | 'evening' | 'vanta_choice'
  is_enabled: boolean
  timezone: string
}