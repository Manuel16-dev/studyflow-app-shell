// Single source of truth for "what's due right now" — one query joining
// cards + their subject + their current FSRS state (Supabase embeds via the
// cards -> subjects and cards -> reviews foreign keys). Review.jsx and
// Dashboard.jsx both read this instead of each computing their own version.
import { supabase } from './supabaseClient'

async function allCardsWithState() {
  const { data, error } = await supabase
    .from('cards')
    .select('id, subject_id, front, back, subjects(name), reviews(reps, due)')
  if (error) throw error
  // reviews is a 1:1 embed (card_id is the PK) but guard against either shape.
  return data.map((row) => ({
    ...row,
    review: Array.isArray(row.reviews) ? row.reviews[0] : row.reviews,
  }))
}

export async function getDueQueue(now = Date.now()) {
  const rows = await allCardsWithState()
  return rows
    .filter((r) => !r.review?.due || new Date(r.review.due).getTime() <= now)
    .map((r) => ({
      id: r.id,
      subjectId: r.subject_id,
      subject: r.subjects?.name,
      question: r.front,
      answer: r.back,
    }))
}

export async function getDueCount(now = Date.now()) {
  const rows = await allCardsWithState()
  return rows.filter((r) => !r.review?.due || new Date(r.review.due).getTime() <= now).length
}

// "New" = never reviewed (reps === 0 or no review row yet).
export async function getNewCardCount() {
  const rows = await allCardsWithState()
  return rows.filter((r) => !r.review || r.review.reps === 0).length
}
