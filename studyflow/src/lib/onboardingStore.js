// Where a user is in the first run journey, derived from tables that already
// exist (no new table, no stored flag). Head only counts, so no rows transfer.
import { supabase } from './supabaseClient'
import { requireUserId } from './authHelpers'

async function countRows(table, userId) {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (error) throw error
  return count ?? 0
}

export async function getOnboardingProgress() {
  const userId = await requireUserId()
  const [subjects, cards, reviews, first] = await Promise.all([
    countRows('subjects', userId),
    countRows('cards', userId),
    countRows('review_logs', userId),
    supabase
      .from('subjects')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ])
  return {
    hasSubject: subjects > 0,
    hasCards: cards > 0,
    hasReviewed: reviews > 0,
    firstSubjectId: first.data?.id ?? null,
  }
}
