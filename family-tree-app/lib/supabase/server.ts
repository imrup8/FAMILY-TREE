import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client (uses service role key, bypasses RLS)
// ⚠️ NEVER use this client in client-side code
// ⚠️ NEVER expose SUPABASE_SERVICE_ROLE_KEY to the browser

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'Missing server-side Supabase environment variables (SUPABASE_SERVICE_ROLE_KEY). ' +
    'This key must only be used server-side.'
  )
}

// Create a server-side admin client that bypasses RLS
export function createServerClient() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// Singleton for server-side use
export const supabaseAdmin = createServerClient()
