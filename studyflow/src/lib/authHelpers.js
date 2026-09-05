import { supabase } from './supabaseClient'
import { withTimeout } from './withTimeout'

// Throws if called with no session — every write path requires an
// authenticated user (RequireAuth guards all routes that reach these stores).
// Timeout-wrapped: this is called before nearly every write in the app
// (13 stores), and supabase.auth.getUser() has no built-in timeout — a
// stalled network connection here would otherwise freeze any "save" button
// indefinitely with no feedback.
export async function requireUserId() {
  const { data, error } = await withTimeout(supabase.auth.getUser())
  if (error || !data.user) throw new Error('Not signed in.')
  return data.user.id
}

// Deletes the signed-in user's auth.users row via the delete_my_account()
// RPC — every other table cascades from that FK, so this cleans up
// profiles/subjects/cards/reviews/review_logs/settings in one call. Signs
// out client-side afterward since the session is no longer valid.
export async function deleteAccount() {
  const { error } = await supabase.rpc('delete_my_account')
  if (error) throw error
  await supabase.auth.signOut()
}
