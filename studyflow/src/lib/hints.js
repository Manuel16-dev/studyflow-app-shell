// One short hint per screen, spoken by Flow Buddy the first time a user opens it.
// To add or change a hint, edit this map. Keys are route patterns resolved
// by hintKeyFor() below; ScreenHint.jsx handles display and dismissal.
export const HINTS = {
  '/': "Here is your day: what is due, today's plan and your streak.",
  '/review': 'Flip each card, then tell me how well you knew it. Harder cards come back sooner.',
  '/subjects': 'A subject is one course or topic. Make one, then fill it with cards.',
  '/subjects/:id': 'This is one subject. Tap Generate to turn your notes into cards, or add cards yourself.',
  '/flashcards': 'All your cards in one place. Search, filter by subject, edit or add cards.',
  '/practice': 'Test yourself with exam style questions and check each answer against the worked solution.',
  '/tutor': "Hi, I'm Flow Buddy. Pick a subject and ask me about your notes, or tap Quiz me.",
  '/exams': 'Add an exam and its date to track how ready you are as it gets closer.',
  '/calendar': 'Plan your study time here. Add blocks to a day and see your exam dates too.',
  '/progress': "See how much you have reviewed and how well you remember. It fills in as you study.",
  '/library': 'Everything you have uploaded lives here, with how much of each file has become cards.',
  '/settings': 'Set your daily goals, reminders and theme. Turn on notifications to get nudged when cards are due.',
  '/profile': 'Your account and level. Update your name and see your achievements.',
}

// Maps a pathname to a HINTS key, or null when the screen has no hint.
export function hintKeyFor(pathname) {
  if (pathname === '/') return '/'
  if (/^\/subjects\/[^/]+$/.test(pathname)) return '/subjects/:id'
  const top = '/' + pathname.split('/')[1]
  return HINTS[top] ? top : null
}
