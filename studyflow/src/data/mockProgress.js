// TODO: replace with real analytics from FastAPI/Supabase once backend is wired.
export const mockRetentionTrend = [
  { label: 'Mon', value: 78 },
  { label: 'Tue', value: 82 },
  { label: 'Wed', value: 75 },
  { label: 'Thu', value: 88 },
  { label: 'Fri', value: 85 },
  { label: 'Sat', value: 91 },
  { label: 'Sun', value: 87 },
]

export const mockCardsReviewedTrend = [
  { label: 'Mon', value: 24 },
  { label: 'Tue', value: 31 },
  { label: 'Wed', value: 18 },
  { label: 'Thu', value: 42 },
  { label: 'Fri', value: 27 },
  { label: 'Sat', value: 35 },
  { label: 'Sun', value: 34 },
]

export const mockConsistency = {
  streakDays: 12,
  last7Days: [true, true, true, false, true, true, true],
}

export const mockProgressSummary = {
  retention: 84,
  cardsReviewedThisWeek: 211,
  overallMastery: 72,
}
