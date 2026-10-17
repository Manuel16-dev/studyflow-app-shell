// Study session tracking, backed by Supabase (`study_sessions` table — one
// row per completed review session: when it started and how long it ran).
// This is the source of truth for "Study Time" and "Streak" on the
// Dashboard — both are real wall-clock signals, not derived from card counts.
import { supabase } from './supabaseClient'
import { requireUserId } from './authHelpers'
import { dayKey, startOfDay, addDays } from './dates'

// Call once when a review session ends, with when it started and how long
// it ran. Skips zero-length sessions (e.g. the student opened Review and
// left immediately) so they don't pad study time or falsely extend a streak.
async function writeStudySession(startedAt, durationSeconds) {
  if (durationSeconds <= 0) return
  const userId = await requireUserId()
  const { error } = await supabase.from('study_sessions').insert({
    user_id: userId,
    started_at: new Date(startedAt).toISOString(),
    duration_seconds: Math.round(durationSeconds),
  })
  if (error) throw error
}

// Review.jsx logs its session on unmount (fire and forget), and the
// Dashboard mounts right after. Streak achievements read study_sessions, so
// they must wait for that in-flight write or they'd miss today's session.
let pendingLog = Promise.resolve()
export function whenSessionLogged() {
  return pendingLog
}

export function logStudySession(startedAt, durationSeconds) {
  const p = writeStudySession(startedAt, durationSeconds)
  pendingLog = p.catch(() => {})
  return p
}

export async function getStudyTimeTodayMinutes() {
  const userId = await requireUserId()
  const startOfToday = startOfDay()
  const { data, error } = await supabase
    .from('study_sessions')
    .select('duration_seconds')
    .eq('user_id', userId)
    .gte('started_at', startOfToday.toISOString())
  if (error) throw error
  const totalSeconds = data.reduce((sum, row) => sum + row.duration_seconds, 0)
  return Math.round(totalSeconds / 60)
}

// All-time total, in minutes — the Profile page's lifetime stat, distinct
// from getStudyTimeTodayMinutes() which only covers today.
export async function getTotalStudyMinutes() {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('study_sessions')
    .select('duration_seconds')
    .eq('user_id', userId)
  if (error) throw error
  const totalSeconds = data.reduce((sum, row) => sum + row.duration_seconds, 0)
  return Math.round(totalSeconds / 60)
}

// Consecutive calendar days (ending today or yesterday) with at least one
// logged session. Today not having a session yet doesn't break the streak
// until the day actually passes — a missed *yesterday* does.
export async function getStreakDays() {
  const userId = await requireUserId()
  const { data, error } = await supabase
    .from('study_sessions')
    .select('started_at')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
  if (error) throw error

  const studiedDays = new Set(data.map((row) => dayKey(new Date(row.started_at))))
  if (studiedDays.size === 0) return 0

  // Step by calendar day (not 24h) so a daylight saving change can't make
  // the cursor land on the same day twice or skip one.
  let cursor = startOfDay()
  if (!studiedDays.has(dayKey(cursor))) {
    cursor = addDays(cursor, -1)
    if (!studiedDays.has(dayKey(cursor))) return 0
  }

  let streak = 0
  while (studiedDays.has(dayKey(cursor))) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}
