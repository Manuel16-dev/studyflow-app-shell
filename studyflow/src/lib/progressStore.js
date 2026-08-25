// Real analytics for the Progress page — replaces mockProgress.js and
// mockDashboard's mockNeedsAttention entirely. Everything here derives
// from data that already exists (review_logs, study_sessions, subjects +
// reviews via getSubjectMastery) rather than a new table.
import { supabase } from './supabaseClient'
import { requireUserId } from './authHelpers'
import { getSubjectMastery, getWeakSubjects } from './subjectsStore'
import { getStreakDays } from './studySessionsStore'
import { Rating } from './fsrs'

const MS_PER_DAY = 86400000

// Local (client) calendar-day key — same convention as studySessionsStore,
// so "today" means the same thing across every analytics surface.
function dayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// Oldest-to-newest list of the last n calendar days, including today —
// the order both charts and the consistency row render left-to-right.
function lastNDays(n) {
  return Array.from({ length: n }, (_, i) => new Date(Date.now() - (n - 1 - i) * MS_PER_DAY))
}

async function fetchReviewLogsSince(sinceDate) {
  const userId = await requireUserId()
  let query = supabase.from('review_logs').select('rating, reviewed_at').eq('user_id', userId)
  if (sinceDate) query = query.gte('reviewed_at', sinceDate.toISOString())
  const { data, error } = await query
  if (error) throw error
  return data
}

// All-time recall success rate — % of reviews NOT rated "Again". This is
// deliberately all-time, not a recent window: it's the headline "is this
// actually working" number, and the 7-day chart already covers the trend.
export async function getRetentionRate() {
  const logs = await fetchReviewLogsSince(null)
  if (logs.length === 0) return null
  const successful = logs.filter((l) => l.rating !== Rating.Again).length
  return Math.round((successful / logs.length) * 100)
}

export async function getCardsReviewedThisWeek() {
  const logs = await fetchReviewLogsSince(new Date(Date.now() - 7 * MS_PER_DAY))
  return logs.length
}

// Simple average of live per-subject mastery (see subjectsStore) — subjects
// with zero cards are already excluded there, so this only reflects
// subjects the student has actually started.
export async function getOverallMastery() {
  const mastery = Object.values(await getSubjectMastery())
  if (mastery.length === 0) return null
  return Math.round(mastery.reduce((a, b) => a + b, 0) / mastery.length)
}

// Day-by-day retention % and review counts for the last 7 calendar days,
// one query shared by both trend charts. Days with zero reviews show as
// 0% retention (not blank) — read alongside the reviewed-count chart,
// where 0 reviews that day explains why, rather than in isolation.
export async function getWeeklyTrends() {
  const days = lastNDays(7)
  const logs = await fetchReviewLogsSince(days[0])

  const byDay = {}
  for (const log of logs) {
    const key = dayKey(new Date(log.reviewed_at))
    byDay[key] ??= { total: 0, successful: 0 }
    byDay[key].total += 1
    if (log.rating !== Rating.Again) byDay[key].successful += 1
  }

  const retentionTrend = days.map((d) => {
    const bucket = byDay[dayKey(d)]
    return {
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      value: bucket ? Math.round((bucket.successful / bucket.total) * 100) : 0,
    }
  })
  const cardsTrend = days.map((d) => ({
    label: d.toLocaleDateString('en-US', { weekday: 'short' }),
    value: byDay[dayKey(d)]?.total ?? 0,
  }))

  return { retentionTrend, cardsTrend }
}

// Which of the last 7 calendar days had a logged study session — the
// Consistency card's day-dot row. Streak itself reuses studySessionsStore
// so the two numbers can never quietly disagree.
export async function getConsistencyLast7Days() {
  const userId = await requireUserId()
  const days = lastNDays(7)
  const { data, error } = await supabase
    .from('study_sessions')
    .select('started_at')
    .eq('user_id', userId)
    .gte('started_at', days[0].toISOString())
  if (error) throw error
  const studiedDays = new Set(data.map((row) => dayKey(new Date(row.started_at))))
  return days.map((d) => studiedDays.has(dayKey(d)))
}

export { getWeakSubjects, getStreakDays }
