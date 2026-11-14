// One hint per screen, spoken by Flow Buddy the first time a user opens it.
// To add or change a hint, edit this map. Keys are route patterns resolved
// by hintKeyFor() below; ScreenHint.jsx handles display and dismissal.
// A hint is a plain string, or an object { id, text, example } for a hint
// with a worked example. Change `id` to show an updated hint to people who
// already dismissed the old one.
export const HINTS = {
  '/': "Here is your day: what is due, today's plan and your streak.",
  '/review': {
    id: 'review-v2',
    text: 'Flip the card, then rate how well you remembered it. Your rating decides when the card comes back, so be honest. Example:',
    example: {
      question: 'What is the capital of Australia?',
      answer: 'Canberra',
      ratings: [
        { label: 'Again', tone: 'danger', text: 'You blanked, or said Sydney. The card comes back very soon, until it sticks.' },
        { label: 'Hard', tone: 'accent', text: 'You got Canberra, but only after a long think or a guess. It comes back sooner than usual.' },
        { label: 'Good', tone: 'secondary', text: 'You knew Canberra after a normal moment of thought. It comes back after a comfortable gap.' },
        { label: 'Easy', tone: 'info', text: 'Instant, no thinking. It goes far into the future so you do not waste time on it.' },
      ],
    },
  },
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

// The id remembered once a hint is dismissed: the hint's own `id` if it has
// one, otherwise its route key.
export function hintIdFor(key) {
  const hint = HINTS[key]
  return (hint && typeof hint === 'object' && hint.id) || key
}

// Maps a pathname to a HINTS key, or null when the screen has no hint.
export function hintKeyFor(pathname) {
  if (pathname === '/') return '/'
  if (/^\/subjects\/[^/]+$/.test(pathname)) return '/subjects/:id'
  const top = '/' + pathname.split('/')[1]
  return HINTS[top] ? top : null
}
