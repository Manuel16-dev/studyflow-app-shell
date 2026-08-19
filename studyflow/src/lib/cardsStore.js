// Cards, backed by Supabase (`cards` table, RLS-scoped to auth.uid()).
import { supabase } from './supabaseClient'
import { requireUserId } from './authHelpers'

export function nextCardId() {
  return `local-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

export async function getCards(subjectId) {
  const { data, error } = await supabase
    .from('cards')
    .select('id, front, back')
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function getCardCount(subjectId) {
  const { count, error } = await supabase
    .from('cards')
    .select('id', { count: 'exact', head: true })
    .eq('subject_id', subjectId)
  if (error) throw error
  return count ?? 0
}

// One query for every subject's card count — used by the Subjects grid so
// it doesn't fire N requests while rendering N cards.
export async function getCardCounts() {
  const { data, error } = await supabase.from('cards').select('subject_id')
  if (error) throw error
  return data.reduce((acc, { subject_id }) => {
    acc[subject_id] = (acc[subject_id] ?? 0) + 1
    return acc
  }, {})
}

export async function addCard(subjectId, card) {
  const userId = await requireUserId()
  const { error } = await supabase
    .from('cards')
    .insert({ id: card.id, subject_id: subjectId, user_id: userId, front: card.front, back: card.back })
  if (error) throw error
  return getCards(subjectId)
}

// Bulk insert — used by the AI-generated-cards approve flow.
export async function addCards(subjectId, cards) {
  const userId = await requireUserId()
  const rows = cards.map((c) => ({
    id: c.id,
    subject_id: subjectId,
    user_id: userId,
    front: c.front,
    back: c.back,
  }))
  const { error } = await supabase.from('cards').insert(rows)
  if (error) throw error
  return getCards(subjectId)
}

export async function updateCard(subjectId, cardId, patch) {
  const { error } = await supabase
    .from('cards')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', cardId)
  if (error) throw error
  return getCards(subjectId)
}

export async function deleteCard(subjectId, cardId) {
  const { error } = await supabase.from('cards').delete().eq('id', cardId)
  if (error) throw error
  return getCards(subjectId)
}
