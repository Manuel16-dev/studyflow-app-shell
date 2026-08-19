import { supabase } from './supabaseClient'
import { requireUserId } from './authHelpers'

export async function updateProfile(patch) {
  const userId = await requireUserId()
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId)
  if (error) throw error
}
