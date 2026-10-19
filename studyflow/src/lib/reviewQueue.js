// Single source of truth for "what's due right now" — one query joining
// cards + their subject + their current FSRS state (Supabase embeds via the
// cards -> subjects and cards -> reviews foreign keys). Review.jsx and
// Dashboard.jsx both read this instead of each computing their own version.
import { supabase } from './supabaseClient'
import { retrievability } from './fsrs'
import { daysUntilKey } from './dates'

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

// --- Practice (outside the schedule) ----------------------------------------
// Targeted drills that deliberately do NOT touch FSRS scheduling or the
// review log (see Review.jsx): practising a card early shouldn't push its
// next due date out or skew retention numbers. Three sources:
//   weak      reviewed cards with the lowest current recall (retrievability)
//   practice  cards generated as practice questions (kind = 'practice')
//   exam      cards in subjects with an exam in the next 30 days, weakest first
export const PRACTICE_SOURCES = ['weak', 'practice', 'exam']
const EXAM_WINDOW_DAYS = 30
const MS_PER_DAY = 86400000

async function practicePool() {
  const { data, error } = await supabase
    .from('cards')
    .select('id, subject_id, front, back, kind, subjects(name), reviews(stability, last_review)')
  if (error) throw error
  const now = Date.now()
  return data.map((row) => {
    const review = Array.isArray(row.reviews) ? row.reviews[0] : row.reviews
    const reviewed = review?.stability != null
    const elapsedDays = review?.last_review ? (now - new Date(review.last_review).getTime()) / MS_PER_DAY : 0
    return {
      id: row.id,
      subjectId: row.subject_id,
      subject: row.subjects?.name,
      question: row.front,
      answer: row.back,
      kind: row.kind,
      reviewed,
      // Never-reviewed cards sort as weakest (0), but 'weak' excludes them:
      // brand new cards belong in the normal review queue.
      recall: reviewed ? retrievability(elapsedDays, review.stability) : 0,
    }
  })
}

async function examSubjectIds() {
  const { data, error } = await supabase.from('exams').select('subject_id, exam_date')
  if (error) throw error
  return new Set(
    data.filter((e) => {
      const days = daysUntilKey(e.exam_date)
      return days >= 0 && days <= EXAM_WINDOW_DAYS
    }).map((e) => e.subject_id)
  )
}

function pickForSource(pool, source, examSubjects) {
  if (source === 'practice') return pool.filter((c) => c.kind === 'practice')
  if (source === 'exam') return pool.filter((c) => examSubjects.has(c.subjectId))
  return pool.filter((c) => c.reviewed)
}

// How many cards each practice source could serve right now (optionally for
// one subject) — drives the counts on the Practice page.
export async function getPracticeCounts(subjectId = null) {
  const [pool, examSubjects] = await Promise.all([practicePool(), examSubjectIds()])
  const scoped = subjectId ? pool.filter((c) => c.subjectId === subjectId) : pool
  return Object.fromEntries(PRACTICE_SOURCES.map((s) => [s, pickForSource(scoped, s, examSubjects).length]))
}

// Up to `limit` cards for a practice session, weakest recall first (so the
// session starts with what needs the most work).
export async function getPracticeQueue({ source, subjectId = null, limit = 10 }) {
  const [pool, examSubjects] = await Promise.all([practicePool(), examSubjectIds()])
  const scoped = subjectId ? pool.filter((c) => c.subjectId === subjectId) : pool
  return pickForSource(scoped, source, examSubjects)
    .sort((a, b) => a.recall - b.recall)
    .slice(0, limit)
}
