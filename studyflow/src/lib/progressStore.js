// Real analytics for the Progress page — replaces mockProgress.js and
// mockDashboard's mockNeedsAttention entirely. Everything here derives
// from data that already exists (review_logs, study_sessions, subjects +
// reviews via getSubjectMastery) rather than a new table.
import { supabase } from './supabaseClient'
import { requireUserId } from './authHelpers'
import { getSubjectMastery, getWeakSubjects } from './subjectsStore'
import { getStreakDays } from './studySessionsStore'
import { Rating } from './fsrs'
import { dayKey, lastNDays } from './dates'

const PAGE = 1000

// Every review log since a date, fetched in pages. PostgREST caps a single
// response at 1000 rows, so a plain select would silently truncate a busy
// week. Only used for the bounded 7-day window; all-time numbers use
// head-only counts below.
async function fetchReviewLogsSince(sinceDate) {
  const userId = await requireUserId()
  const rows = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('review_logs')
      .select('rating, reviewed_at')
      .eq('user_id', userId)
      .gte('reviewed_at', sinceDate.toISOString())
      .order('reviewed_at', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw error
    rows.push(...data)
    if (data.length < PAGE) return rows
  }
}

// Head-only count: no rows are transferred, and there is no row cap.
async function countLogs(userId, { sinceDate, rating, notRating } = {}) {
  let query = supabase.from('review_logs').select('*', { count: 'exact', head: true }).eq('user_id', userId)
  if (sinceDate) query = query.gte('reviewed_at', sinceDate.toISOString())
  if (rating != null) query = query.eq('rating', rating)
  if (notRating != null) query = query.neq('rating', notRating)
  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}

// All-time recall success rate: % of reviews NOT rated "Again". This is
// deliberately all-time, not a recent window: it's the headline "is this
// actually working" number, and the 7-day chart already covers the trend.
export async function getRetentionRate() {
  const userId = await requireUserId()
  const [total, successful] = await Promise.all([
    countLogs(userId),
    countLogs(userId, { notRating: Rating.Again }),
  ])
  if (total === 0) return null
  return Math.round((successful / total) * 100)
}

// Reviews in the last 7 calendar days (today included), same window as the
// weekly charts so the numbers agree.
export async function getCardsReviewedThisWeek() {
  const userId = await requireUserId()
  return countLogs(userId, { sinceDate: lastNDays(7)[0] })
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

// Minutes studied per day for the last 7 calendar days — the trend view
// studySessionsStore doesn't provide (it only has "today" and "lifetime").
// Same table/window as getConsistencyLast7Days, different aggregation.
export async function getStudyTimeTrend() {
  const userId = await requireUserId()
  const days = lastNDays(7)
  const { data, error } = await supabase
    .from('study_sessions')
    .select('started_at, duration_seconds')
    .eq('user_id', userId)
    .gte('started_at', days[0].toISOString())
  if (error) throw error

  const secondsByDay = {}
  for (const row of data) {
    const key = dayKey(new Date(row.started_at))
    secondsByDay[key] = (secondsByDay[key] ?? 0) + row.duration_seconds
  }

  return days.map((d) => ({
    label: d.toLocaleDateString('en-US', { weekday: 'short' }),
    value: Math.round((secondsByDay[dayKey(d)] ?? 0) / 60),
  }))
}

// All-time Again/Hard/Good/Easy breakdown — deliberately all-time like
// getRetentionRate (the 7-day charts above already cover the trend view).
// Distinct from retention rate: retention collapses this to a single
// success/fail number, this shows the shape behind it.
const RATING_LABELS = { [Rating.Again]: 'Again', [Rating.Hard]: 'Hard', [Rating.Good]: 'Good', [Rating.Easy]: 'Easy' }

export async function getRatingDistribution() {
  const userId = await requireUserId()
  const ratings = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]
  const counts = await Promise.all(ratings.map((rating) => countLogs(userId, { rating })))
  const total = counts.reduce((a, b) => a + b, 0)
  if (total === 0) return null
  return ratings.map((rating, i) => ({
    label: RATING_LABELS[rating],
    count: counts[i],
    percent: Math.round((counts[i] / total) * 100),
  }))
}

export { getWeakSubjects, getStreakDays }
