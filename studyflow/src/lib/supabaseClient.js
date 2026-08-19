import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY — check .env.local')
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true, // survive closing the tab/app — session lives in localStorage
    autoRefreshToken: true, // silently refresh before the token expires
    detectSessionInUrl: true, // needed for the Google OAuth redirect to complete
  },
})

export async function getUserId() {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('Not signed in')
  return data.user.id
}
