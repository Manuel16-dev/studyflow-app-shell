// Subjects, backed by Supabase (`subjects` table, RLS-scoped to auth.uid()).
// Same function names as the old localStorage version — every call is now
// async, which is the one thing every caller had to change.
import { supabase } from './supabaseClient'
import { requireUserId } from './authHelpers'
import { getCardCounts } from './cardsStore'
import { retrievability } from './fsrs'

const MS_PER_DAY = 86400000

export async function getSubjects() {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getSubject(id) {
  const { data, error } = await supabase.from('subjects').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function createSubject(subject) {
  const userId = await requireUserId()
  const { error } = await supabase.from('subjects').insert({ ...subject, user_id: userId })
  if (error) throw error
  return getSubjects()
}

export async function updateSubject(id, patch) {
  const { error } = await supabase
    .from('subjects')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
  return getSubjects()
}

export async function deleteSubject(id) {
  const { error } = await supabase.from('subjects').delete().eq('id', id)
  if (error) throw error
  return getSubjects()
}

// Live per-subject mastery: average FSRS retrievability (predicted recall
// probability right now) across every card in the subject, with
// never-reviewed cards counted as 0% — a subject full of unstudied cards
// isn't "mastered" just because the few cards it has seen went well.
// Replaces the static `subjects.mastery` column, which nothing recalculates.
export async function getSubjectMastery() {
  const userId = await requireUserId()
  const [{ data, error }, cardCounts] = await Promise.all([
    supabase.from('reviews').select('stability, last_review, cards!inner(subject_id)').eq('user_id', userId),
    getCardCounts(),
  ])
  if (error) throw error

  const now = Date.now()
  const retrievabilitySumBySubject = {}
  for (const row of data) {
    if (row.stability == null) continue
    const subjectId = row.cards.subject_id
    const elapsedDays = row.last_review ? (now - new Date(row.last_review).getTime()) / MS_PER_DAY : 0
    const r = retrievability(elapsedDays, row.stability)
    retrievabilitySumBySubject[subjectId] = (retrievabilitySumBySubject[subjectId] ?? 0) + r
  }

  const mastery = {}
  for (const [subjectId, totalCards] of Object.entries(cardCounts)) {
    if (totalCards === 0) continue
    const sum = retrievabilitySumBySubject[subjectId] ?? 0
    mastery[subjectId] = Math.round((sum / totalCards) * 100)
  }
  return mastery // { [subjectId]: 0-100 }
}

// Subjects with at least one card, weakest mastery first — used by the
// Dashboard's "Needs Attention" card. `limit` keeps that card short.
export async function getWeakSubjects(limit = 3) {
  const [subjects, mastery] = await Promise.all([getSubjects(), getSubjectMastery()])
  return subjects
    .filter((s) => mastery[s.id] != null)
    .map((s) => ({ ...s, mastery: mastery[s.id] }))
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, limit)
}
