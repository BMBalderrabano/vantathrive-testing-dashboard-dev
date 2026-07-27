import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/** Typed Supabase client with service_role — server-only, bypasses RLS. */
export const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey)

/**
 * Untyped escape hatch for legacy QA tables/RPCs not yet in generated Database types.
 * Prefer supabaseAdmin when the table/RPC exists in database.types.ts.
 */
export const supabaseAdminLegacy = supabaseAdmin as SupabaseClient

/** Factory for callers that need a fresh client instance. */
export function createServiceRoleClient() {
  return createClient<Database>(supabaseUrl, serviceRoleKey)
}
