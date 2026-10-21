// Single source of truth for "what's due right now" — one query joining
// cards + their subject + their current FSRS state (Supabase embeds via the
// cards -> subjects and cards -> reviews foreign keys). Review.jsx and
// Dashboard.jsx both read this instead of each computing their own version.
import { supabase } from './supabaseClient'
import { retrievability } from './fsrs'
import { daysUntilKey, startOfDay } from './dates'
import { requireUserId } from './authHelpers'
import { getSettings } from './settingsStore'

// Daily limits live in settings.study_behavior. `undefined` means the user
// never touched the setting (use the default); `null` means "unlimited".
export const DEFAULT_NEW_PER_DAY = 20
export const DEFAULT_REVIEWS_PER_DAY = 200
const limitOf = (value, fallback) => (value === null ? Infinity : typeof value === 'number' ? value : fallback)

async function allCardsWithState() {
  const { data, error } = await supabase
    .from('cards')
    .select('id, subject_id, front, back, subjects(name), reviews(reps, due)')
    .eq('suspended', false)
  if (error) throw error
  // reviews is a 1:1 embed (card_id is the PK) but guard against either shape.
  return data.map((row) => ({
    ...row,
    review: Array.isArray(row.reviews) ? row.reviews[0] : row.reviews,
  }))
}

// What the student has already done today (their own local day): which cards
// they met for the first time today, and how many repeat reviews they did.
// Read from review_logs, which practice never writes to.
async function todayActivity() {
  const userId = await requireUserId()
  const since = startOfDay().toISOString()
  const { data: logs, error } = await supabase
    .from('review_logs')
    .select('card_id')
    .eq('user_id', userId)
    .gte('reviewed_at', since)
  if (error) throw error
  const ids = [...new Set(logs.map((l) => l.card_id))]
  if (ids.length === 0) return { newToday: new Set(), reviewsDone: 0 }

  // A card is "new today" if it has no log from before today. Chunked so a
  // long list of ids can't overflow the request URL.
  const seenBefore = new Set()
  for (let i = 0; i < ids.length; i += 100) {
    const { data: earlier, error: e2 } = await supabase
      .from('review_logs')
      .select('card_id')
      .eq('user_id', userId)
      .lt('reviewed_at', since)
      .in('card_id', ids.slice(i, i + 100))
    if (e2) throw e2
    for (const l of earlier) seenBefore.add(l.card_id)
  }
  const newToday = new Set(ids.filter((id) => !seenBefore.has(id)))
  const reviewsDone = logs.filter((l) => !newToday.has(l.card_id)).length
  return { newToday, reviewsDone }
}

// The due queue for right now, with the daily limits applied. Order: cards
// first met today that are due again (always finished), then overdue reviews
// (most overdue first, up to the review budget), then brand new cards (up to
// the new card budget). `heldBack` is how many due cards the limits left out.
export async function getDueSession(now = Date.now()) {
  const [rows, settings, activity] = await Promise.all([
    allCardsWithState(),
    getSettings().catch(() => null),
    todayActivity().catch(() => ({ newToday: new Set(), reviewsDone: 0 })),
  ])
  const behavior = settings?.studyBehavior ?? {}
  const newBudget = Math.max(0, limitOf(behavior.newCardsPerDay, DEFAULT_NEW_PER_DAY) - activity.newToday.size)
  const reviewBudget = Math.max(0, limitOf(behavior.maxReviewsPerDay, DEFAULT_REVIEWS_PER_DAY) - activity.reviewsDone)

  const learning = []
  const reviews = []
  const fresh = []
  for (const r of rows) {
    const isDue = !r.review?.due || new Date(r.review.due).getTime() <= now
    if (!isDue) continue
    if (activity.newToday.has(r.id)) learning.push(r)
    else if (!r.review || r.review.reps === 0) fresh.push(r)
    else reviews.push(r)
  }
  reviews.sort((a, b) => new Date(a.review.due || 0) - new Date(b.review.due || 0))

  const picked = [...learning, ...reviews.slice(0, reviewBudget), ...fresh.slice(0, newBudget)]
  const totalDue = learning.length + reviews.length + fresh.length
  return {
    queue: picked.map((r) => ({
      id: r.id,
      subjectId: r.subject_id,
      subject: r.subjects?.name,
      question: r.front,
      answer: r.back,
    })),
    heldBack: totalDue - picked.length,
  }
}

export async function getDueQueue(now = Date.now()) {
  return (await getDueSession(now)).queue
}

export async function getDueCount(now = Date.now()) {
  return (await getDueSession(now)).queue.length
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
    .eq('suspended', false)
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
