// Study session tracking, backed by Supabase (`study_sessions` table — one
// row per completed review session: when it started and how long it ran).
// This is the source of truth for "Study Time" and "Streak" on the
// Dashboard — both are real wall-clock signals, not derived from card counts.
import { supabase } from './supabaseClient'
import { requireUserId } from './authHelpers'

const MS_PER_DAY = 86400000

// Local (client) calendar-day key, e.g. "2026-08-22" — streaks are measured
// in the student's own day, not UTC, so studying late at night doesn't
// silently land on "tomorrow".
function dayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// Call once when a review session ends, with when it started and how long
// it ran. Skips zero-length sessions (e.g. the student opened Review and
// left immediately) so they don't pad study time or falsely extend a streak.
export async function logStudySession(startedAt, durationSeconds) {
  if (durationSeconds <= 0) return
  const userId = await requireUserId()
  const { error } = await supabase.from('study_sessions').insert({
    user_id: userId,
    started_at: new Date(startedAt).toISOString(),
    duration_seconds: Math.round(durationSeconds),
  })
  if (error) throw error
}

export async function getStudyTimeTodayMinutes() {
  const userId = await requireUserId()
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
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

  let cursor = new Date()
  if (!studiedDays.has(dayKey(cursor))) {
    cursor = new Date(cursor.getTime() - MS_PER_DAY)
    if (!studiedDays.has(dayKey(cursor))) return 0
  }

  let streak = 0
  while (studiedDays.has(dayKey(cursor))) {
    streak += 1
    cursor = new Date(cursor.getTime() - MS_PER_DAY)
  }
  return streak
}
