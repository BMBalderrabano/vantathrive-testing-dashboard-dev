import { createClient } from '@supabase/supabase-js'

import type { Database } from './supabase/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/** Browser/anon client for Auth only — safe for client components. */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
