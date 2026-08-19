import { supabase } from './supabaseClient'

// Throws if called with no session — every write path requires an
// authenticated user (RequireAuth guards all routes that reach these stores).
export async function requireUserId() {
  const { data, error } = await supabase.auth.getUser()
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
