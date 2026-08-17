// TODO: replace with real plan generated from FSRS due-dates + exam deadlines
// once the backend scheduler exists.

// dayOffset: 0 = today, 1 = tomorrow, etc. Blocks are generated relative to
// "today" (like Dashboard's greeting()) so the screen always shows a
// current-looking week instead of a hardcoded date that goes stale.
export const mockPlanBlocks = [
  { id: 'b1', dayOffset: 0, time: '4:30 PM', title: 'Double Integrals Review', duration: '20 min', subjectId: 'calculus' },
  { id: 'b2', dayOffset: 0, time: '6:30 PM', title: 'Flashcard Review Session', duration: '25 min', subjectId: null },
  { id: 'b3', dayOffset: 1, time: '1:00 PM', title: 'Data Structures Practice', duration: '30 min', subjectId: 'data-structures' },
  { id: 'b4', dayOffset: 2, time: '4:00 PM', title: 'Tree Rotation Deep Dive', duration: '25 min', subjectId: 'data-structures' },
  { id: 'b5', dayOffset: 3, time: '4:00 PM', title: 'Weak-Topic Review Session', duration: '20 min', subjectId: null },
  { id: 'b6', dayOffset: 4, time: '4:00 PM', title: 'Physics Mock Test', duration: '40 min', subjectId: 'physics' },
]

export function weekdayLabel(dayOffset) {
  const d = new Date()
  d.setDate(d.getDate() + dayOffset)
  return {
    weekday: d.toLocaleDateString(undefined, { weekday: 'short' }),
    date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    isToday: dayOffset === 0,
  }
}
