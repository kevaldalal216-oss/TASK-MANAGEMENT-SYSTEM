import { createClient } from '@supabase/supabase-js'

export const supabaseUrl =
  import.meta.env.REACT_APP_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_URL

export const supabasePublishableKey =
  import.meta.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey)
  : null
