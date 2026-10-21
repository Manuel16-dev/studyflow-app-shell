import { supabase } from './supabaseClient'
import { withTimeout } from './withTimeout'

// Throws if called with no session — every write path requires an
// authenticated user (RequireAuth guards all routes that reach these stores).
//
// Reads the user id from the locally stored session (getSession) instead of
// asking the auth server (getUser) every time. This is called before nearly
// every read and write in the app, and a pageful of them used to fire a dozen
// network round-trips at once; on a slow connection those stalled and surfaced
// as "Request timed out". The id is only used to scope queries: the database
// enforces ownership with RLS from the JWT itself, so an unverified local id
// can't expose anyone's data. getSession refreshes an expired token itself.
// Timeout-wrapped so a stalled refresh can't freeze a "save" button forever.
export async function requireUserId() {
  const { data, error } = await withTimeout(supabase.auth.getSession())
  if (error || !data?.session?.user) throw new Error('Not signed in.')
  return data.session.user.id
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
