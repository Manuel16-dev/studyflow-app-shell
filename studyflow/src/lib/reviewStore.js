// FSRS scheduling state per card, backed by Supabase (`reviews` table —
// one row per card, current state only) plus an append-only `review_logs`
// table for history. Same shape fsrs.js already produces (stability,
// difficulty, reps, lapses, due, lastReview) — due/lastReview convert
// between epoch-ms (what fsrs.js works in) and timestamptz (Postgres).
import { supabase } from './supabaseClient'
import { requireUserId } from './authHelpers'
import { newCardState } from './fsrs'

function rowToState(row) {
  if (!row) return newCardState()
  return {
    stability: row.stability,
    difficulty: row.difficulty,
    reps: row.reps,
    lapses: row.lapses,
    due: row.due ? new Date(row.due).getTime() : null,
    lastReview: row.last_review ? new Date(row.last_review).getTime() : null,
  }
}

export async function getCardState(cardId) {
  const { data, error } = await supabase.from('reviews').select('*').eq('card_id', cardId).maybeSingle()
  if (error) throw error
  return rowToState(data)
}

export async function saveCardState(cardId, state) {
  const userId = await requireUserId()
  const { error } = await supabase.from('reviews').upsert({
    card_id: cardId,
    user_id: userId,
    stability: state.stability,
    difficulty: state.difficulty,
    reps: state.reps,
    lapses: state.lapses,
    due: state.due ? new Date(state.due).toISOString() : null,
    last_review: state.lastReview ? new Date(state.lastReview).toISOString() : null,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

// Append-only history event — call alongside saveCardState with the rating
// that produced the new state. Closes the PRD's "review history" MVP gap;
// the `reviews` table above only ever holds current state, not the trail.
export async function logReview(cardId, rating, state) {
  const userId = await requireUserId()
  const { error } = await supabase.from('review_logs').insert({
    card_id: cardId,
    user_id: userId,
    rating,
    stability_after: state.stability,
    difficulty_after: state.difficulty,
  })
  if (error) throw error
}

export async function resetAllReviewState() {
  const userId = await requireUserId()
  const { error } = await supabase.from('reviews').delete().eq('user_id', userId)
  if (error) throw error
}
