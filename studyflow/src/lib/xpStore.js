// XP, levels and achievements (PRD section 39).
//
// XP is DERIVED server-side from review_logs + study_sessions by the
// get_xp_summary() Postgres function (see the xp_and_achievements migration
// for the locked formula), so it needs no write path and counts all history.
// The only stored XP is the one-time bonus on each unlocked achievement.
//
// Design rule from the PRD: gamification must not reward meaningless
// interaction more than learning. That is why review XP is scaled by how
// close to due a card was (cramming earns ~nothing), why Easy pays the same
// as Good (ratings are self-reported), and why every achievement below is
// tied to reviewing, retention or mastery, never to creating or tapping.
import { supabase } from './supabaseClient'
import { requireUserId } from './authHelpers'
import { getStreakDays, whenSessionLogged } from './studySessionsStore'
import { getSubjectMastery } from './subjectsStore'
import { getExams } from './examsStore'
import { getSettings } from './settingsStore'
import { Rating } from './fsrs'
import { dayKey } from './dates'

// --- Levels -----------------------------------------------------------------
// level = floor(sqrt(xp / 100)) + 1. Level N starts at 100 * (N - 1)^2 XP.
export function levelInfo(totalXp) {
  const xp = Math.max(0, Math.floor(totalXp ?? 0))
  const level = Math.floor(Math.sqrt(xp / 100)) + 1
  const floorXp = 100 * (level - 1) ** 2
  const nextXp = 100 * level ** 2
  return {
    level,
    xp,
    floorXp,
    nextXp,
    intoLevel: xp - floorXp,
    levelSpan: nextXp - floorXp,
    percent: Math.min(100, Math.round(((xp - floorXp) / (nextXp - floorXp)) * 100)),
    toNext: nextXp - xp,
  }
}

export async function getXpSummary() {
  const { data, error } = await supabase.rpc('get_xp_summary')
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  return {
    totalXp: Number(row?.total_xp ?? 0),
    todayXp: Number(row?.today_xp ?? 0),
    reviewXp: Number(row?.review_xp ?? 0),
    goalBonusXp: Number(row?.goal_bonus_xp ?? 0),
    achievementXp: Number(row?.achievement_xp ?? 0),
  }
}

// --- Achievements -----------------------------------------------------------
// stat: which live number the achievement is measured against (see
// syncAchievements). group: section heading on the Profile page.
// Every one is earned by reviewing, retaining or mastering, never by merely
// creating things or tapping around (PRD rule).
export const ACHIEVEMENTS = [
  // Reviews
  { key: 'first_review', group: 'Reviews', kind: 'first', title: 'First review', description: 'Review your first card.', stat: 'reviews', target: 1, xp: 20 },
  { key: 'reviews_100', group: 'Reviews', kind: 'reviews', title: '100 reviews', description: 'Complete 100 card reviews.', stat: 'reviews', target: 100, xp: 50 },
  { key: 'reviews_250', group: 'Reviews', kind: 'reviews', title: '250 reviews', description: 'Complete 250 card reviews.', stat: 'reviews', target: 250, xp: 100 },
  { key: 'reviews_500', group: 'Reviews', kind: 'reviews', title: '500 reviews', description: 'Complete 500 card reviews.', stat: 'reviews', target: 500, xp: 150 },
  { key: 'reviews_1000', group: 'Reviews', kind: 'reviews', title: '1,000 reviews', description: 'Complete 1,000 card reviews.', stat: 'reviews', target: 1000, xp: 300 },
  { key: 'reviews_2500', group: 'Reviews', kind: 'reviews', title: '2,500 reviews', description: 'Complete 2,500 card reviews.', stat: 'reviews', target: 2500, xp: 500 },
  // Consistency
  { key: 'streak_3', group: 'Consistency', kind: 'streak', title: '3 day streak', description: 'Study 3 days in a row.', stat: 'streak', target: 3, xp: 30 },
  { key: 'streak_7', group: 'Consistency', kind: 'streak', title: '7 day streak', description: 'Study 7 days in a row.', stat: 'streak', target: 7, xp: 75 },
  { key: 'streak_14', group: 'Consistency', kind: 'streak', title: '14 day streak', description: 'Study 14 days in a row.', stat: 'streak', target: 14, xp: 100 },
  { key: 'streak_30', group: 'Consistency', kind: 'streak', title: '30 day streak', description: 'Study 30 days in a row.', stat: 'streak', target: 30, xp: 300 },
  { key: 'streak_100', group: 'Consistency', kind: 'streak', title: '100 day streak', description: 'Study 100 days in a row.', stat: 'streak', target: 100, xp: 500 },
  { key: 'goal_days_7', group: 'Consistency', kind: 'goal', title: 'Goal getter', description: 'Hit your daily study goal on 7 different days.', stat: 'goalDays', target: 7, xp: 75 },
  { key: 'goal_days_30', group: 'Consistency', kind: 'goal', title: 'Goal crusher', description: 'Hit your daily study goal on 30 different days.', stat: 'goalDays', target: 30, xp: 250 },
  // Mastery
  { key: 'mastery_50', group: 'Mastery', kind: 'mastery', title: 'Halfway there', description: 'Reach 50% mastery in any subject.', stat: 'mastery', target: 50, xp: 50 },
  { key: 'mastery_75', group: 'Mastery', kind: 'mastery', title: 'Strong recall', description: 'Reach 75% mastery in any subject.', stat: 'mastery', target: 75, xp: 100 },
  { key: 'mastery_90', group: 'Mastery', kind: 'mastery', title: 'Subject mastered', description: 'Reach 90% mastery in any subject.', stat: 'mastery', target: 90, xp: 200 },
  { key: 'mastery_breadth', group: 'Mastery', kind: 'mastery', title: 'Well rounded', description: 'Reach 50% mastery in 3 different subjects.', stat: 'masteryBreadth', target: 3, xp: 100 },
  { key: 'recall_90', group: 'Mastery', kind: 'recall', title: 'Sharp recall', description: 'Recall 90% or more of your last 50 reviews (not rated Again).', stat: 'recentRetention', target: 90, xp: 100 },
  // Exams: readiness is your subject mastery, so these reward preparing EARLY.
  { key: 'exam_ready_70', group: 'Exams', kind: 'exam', title: 'On track', description: 'Be 70% ready for an exam at least 7 days before it.', stat: 'examReadyEarly', target: 70, xp: 75 },
  { key: 'exam_ready_85', group: 'Exams', kind: 'exam', title: 'Ahead of schedule', description: 'Be 85% ready for an exam at least 7 days before it.', stat: 'examReadyEarly', target: 85, xp: 150 },
]

async function countReviews(userId) {
  const { count, error } = await supabase
    .from('review_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (error) throw error
  return count ?? 0
}

// Success rate over the last 50 reviews. 0 until 50 reviews exist, so a
// lucky handful can't unlock it.
async function recentRetention(userId) {
  const { data, error } = await supabase
    .from('review_logs')
    .select('rating')
    .eq('user_id', userId)
    .order('reviewed_at', { ascending: false })
    .limit(50)
  if (error) throw error
  if (data.length < 50) return 0
  return Math.round((data.filter((l) => l.rating !== Rating.Again).length / 50) * 100)
}

// Number of calendar days (client local, same convention as streaks) on
// which total study time reached the daily goal.
async function goalDays(userId) {
  const [settings, sessions] = await Promise.all([
    getSettings(),
    supabase.from('study_sessions').select('started_at, duration_seconds').eq('user_id', userId),
  ])
  if (sessions.error) throw sessions.error
  const goalSeconds = Math.max(10, settings?.studyBehavior?.dailyTargetMinutes ?? 30) * 60
  const secondsByDay = {}
  for (const row of sessions.data) {
    const key = dayKey(new Date(row.started_at))
    secondsByDay[key] = (secondsByDay[key] ?? 0) + row.duration_seconds
  }
  return Object.values(secondsByDay).filter((secs) => secs >= goalSeconds).length
}

// Best readiness among exams still at least 7 days away.
async function examReadyEarly() {
  const exams = await getExams()
  return Math.max(0, ...exams.filter((e) => e.daysLeft >= 7).map((e) => e.readiness))
}

// Checks every achievement against live data, unlocks any newly earned one
// (insert is idempotent: primary key (user_id, key) plus ignoreDuplicates, so
// concurrent calls or offline retries can never double award), and returns
//   items: every achievement with unlocked state and current progress
//   newlyUnlocked: the ones this call unlocked, for the "unlocked" banner
// Mastery is live (it decays as you forget), so unlocks are permanent: once
// earned, an achievement stays earned even if mastery later dips.
export async function syncAchievements() {
  const userId = await requireUserId()
  // Streak reads study_sessions, which Review.jsx writes on unmount.
  await whenSessionLogged()

  // The newer stats are optional: if one query fails it counts as 0 so it
  // can't block every other achievement from being checked.
  const safe = (promise) => promise.catch(() => 0)
  const [reviews, streak, masteryBySubject, existing, retention, goal, examEarly] = await Promise.all([
    countReviews(userId),
    getStreakDays(),
    getSubjectMastery(),
    supabase.from('user_achievements').select('key, unlocked_at').eq('user_id', userId),
    safe(recentRetention(userId)),
    safe(goalDays(userId)),
    safe(examReadyEarly()),
  ])
  if (existing.error) throw existing.error

  const unlockedAt = new Map(existing.data.map((r) => [r.key, r.unlocked_at]))
  const masteryValues = Object.values(masteryBySubject)
  const stats = {
    reviews,
    streak,
    mastery: Math.max(0, ...masteryValues),
    masteryBreadth: masteryValues.filter((m) => m >= 50).length,
    recentRetention: retention,
    goalDays: goal,
    examReadyEarly: examEarly,
  }

  const earnedNow = ACHIEVEMENTS.filter((a) => !unlockedAt.has(a.key) && stats[a.stat] >= a.target)
  let newlyUnlocked = []
  if (earnedNow.length > 0) {
    const { data, error } = await supabase
      .from('user_achievements')
      .upsert(
        earnedNow.map((a) => ({ user_id: userId, key: a.key, xp: a.xp })),
        { onConflict: 'user_id,key', ignoreDuplicates: true }
      )
      .select('key, unlocked_at')
    if (error) throw error
    for (const row of data) unlockedAt.set(row.key, row.unlocked_at)
    const inserted = new Set(data.map((r) => r.key))
    newlyUnlocked = earnedNow.filter((a) => inserted.has(a.key))
  }

  const items = ACHIEVEMENTS.map((a) => ({
    ...a,
    unlockedAt: unlockedAt.get(a.key) ?? null,
    current: Math.min(stats[a.stat], a.target),
  }))
  return { items, newlyUnlocked }
}
