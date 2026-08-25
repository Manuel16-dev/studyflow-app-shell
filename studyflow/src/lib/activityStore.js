// Two Dashboard values that were still mock (mockDashboard.js), both
// derivable from tables that already exist — no new table needed.
// estimatedMinutes: study_sessions duration / review_logs count.
// Recent Activity: review_logs + study_sessions + cards.created_at, merged
// into one feed. There's no dedicated activity-log table; this builds an
// honest one on read instead of writing fabricated copy.
import { supabase } from './supabaseClient'
import { requireUserId } from './authHelpers'

const MS_PER_DAY = 86400000

function dayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function relativeTime(date) {
  const diffMin = Math.round((Date.now() - date.getTime()) / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.round(diffHr / 24)
  return diffDay === 1 ? 'Yesterday' : `${diffDay}d ago`
}

// Average seconds-per-card from real history (total logged study time /
// total reviews logged), applied to today's due count. Replaces the frozen
// "35 min" mock. Falls back to a conservative 45s/card only when there's no
// review history yet to derive a real average from (a brand-new account).
export async function getEstimatedReviewMinutes(dueCount) {
  const userId = await requireUserId()
  const [{ data: sessions, error: sessErr }, { count: reviewCount, error: revErr }] = await Promise.all([
    supabase.from('study_sessions').select('duration_seconds').eq('user_id', userId),
    supabase.from('review_logs').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ])
  if (sessErr) throw sessErr
  if (revErr) throw revErr
  const totalSeconds = sessions.reduce((sum, s) => sum + s.duration_seconds, 0)
  const avgSecondsPerCard = reviewCount > 0 ? totalSeconds / reviewCount : 45
  return Math.max(1, Math.round((avgSecondsPerCard * dueCount) / 60))
}

// Recent Activity feed, merged from three real sources and capped at
// `limit`, most recent first:
// - review_logs, grouped per subject per day -> "Reviewed N cards in X"
// - cards.created_at, grouped per subject per day -> "Created N cards in X"
// - study_sessions, one event each -> "Studied for N minutes"
export async function getRecentActivity(limit = 4) {
  const userId = await requireUserId()
  const since = new Date(Date.now() - 14 * MS_PER_DAY).toISOString()

  const [{ data: logs, error: logErr }, { data: sessions, error: sessErr }, { data: cards, error: cardErr }] =
    await Promise.all([
      supabase
        .from('review_logs')
        .select('reviewed_at, cards(subjects(name))')
        .eq('user_id', userId)
        .gte('reviewed_at', since),
      supabase.from('study_sessions').select('started_at, duration_seconds').eq('user_id', userId).gte('started_at', since),
      supabase.from('cards').select('created_at, subjects(name)').eq('user_id', userId).gte('created_at', since),
    ])
  if (logErr) throw logErr
  if (sessErr) throw sessErr
  if (cardErr) throw cardErr

  function bucketBySubjectDay(rows, getTime, getSubjectName) {
    const buckets = {}
    for (const row of rows) {
      const time = new Date(getTime(row))
      const subjectName = getSubjectName(row) ?? 'Unknown subject'
      const key = `${dayKey(time)}::${subjectName}`
      buckets[key] ??= { count: 0, subjectName, latest: time }
      buckets[key].count += 1
      if (time > buckets[key].latest) buckets[key].latest = time
    }
    return Object.values(buckets)
  }

  const reviewEvents = bucketBySubjectDay(
    logs,
    (r) => r.reviewed_at,
    (r) => r.cards?.subjects?.name
  ).map((b) => ({
    kind: 'review',
    text: `Reviewed ${b.count} card${b.count === 1 ? '' : 's'} in ${b.subjectName}`,
    time: b.latest,
  }))

  const createEvents = bucketBySubjectDay(
    cards,
    (c) => c.created_at,
    (c) => c.subjects?.name
  ).map((b) => ({
    kind: 'create',
    text: `Created ${b.count} new card${b.count === 1 ? '' : 's'} in ${b.subjectName}`,
    time: b.latest,
  }))

  const studyEvents = sessions.map((s) => {
    const minutes = Math.round(s.duration_seconds / 60)
    return {
      kind: 'study',
      text: `Studied for ${minutes} minute${minutes === 1 ? '' : 's'}`,
      time: new Date(s.started_at),
    }
  })

  return [...reviewEvents, ...createEvents, ...studyEvents]
    .sort((a, b) => b.time - a.time)
    .slice(0, limit)
    .map((e) => ({ kind: e.kind, text: e.text, time: relativeTime(e.time) }))
}
