// TODO: replace with real data from FastAPI/Supabase once backend is wired.
export const mockUser = {
  name: 'Emma',
  streakDays: 12,
}

export const mockKpis = {
  reviewsDue: 27,
  reviewsDueProgress: 72,
  newCards: 12,
  studyTimeToday: '1h 24m',
  streakDays: 12,
}

export const mockContinueReview = {
  cardsDue: 27,
  estimatedMinutes: 35,
  dailyGoalPercent: 72,
}

export const mockNeedsAttention = [
  { topic: 'Double Integrals', subject: 'Calculus', mastery: 38, severity: 'weak' },
  { topic: 'Tree Rotation', subject: 'Data Structures', mastery: 54, severity: 'attention' },
  { topic: 'Circuit Analysis', subject: 'Electronics', mastery: 71, severity: 'mastered' },
]

export const mockUpcomingExams = [
  { name: 'Calculus Midterm', daysLeft: 14 },
  { name: 'Data Structures', daysLeft: 21 },
  { name: 'Physics Quiz', daysLeft: 5 },
]

export const mockStudyPlan = [
  { time: '4:30 PM', title: 'Double Integrals Review', duration: '20 min' },
  { time: '6:30 PM', title: 'Flashcard Review Session', duration: '25 min' },
  { time: '7:00 PM', title: 'Data Structures Practice', duration: '30 min' },
  { time: '9:00 PM', title: 'Circuit Analysis Notes', duration: '15 min' },
]

export const mockRecentActivity = [
  { text: 'Reviewed 34 cards in Calculus', time: '1h ago', kind: 'review' },
  { text: 'Created 12 new flashcards', time: '3h ago', kind: 'create' },
  { text: 'Completed practice test', time: '5h ago', kind: 'practice' },
  { text: 'Studied for 45 minutes', time: 'Yesterday', kind: 'study' },
]
