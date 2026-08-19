// TODO: replace with real data from FastAPI/Supabase once backend is wired.
// Seed data only — subjectsStore.js persists the live, editable copy.
// `icon` is a string key (see lib/iconMap.js), not a component reference,
// since this shape now round-trips through localStorage/JSON.
export const subjectColors = [
  { name: 'blue', bg: 'bg-primary', light: 'bg-primary-light' },
  { name: 'green', bg: 'bg-secondary', light: 'bg-secondary-light' },
  { name: 'orange', bg: 'bg-accent', light: 'bg-accent-light' },
  { name: 'purple', bg: 'bg-violet-500', light: 'bg-violet-100' },
]

export const mockSubjects = [
  { id: 'calculus', name: 'Calculus', mastery: 84, color: 'blue', icon: 'sigma' },
  { id: 'data-structures', name: 'Data Structures', mastery: 78, color: 'green', icon: 'network' },
  { id: 'electronics', name: 'Electronics', mastery: 61, color: 'orange', icon: 'zap' },
  { id: 'physics', name: 'Physics', mastery: 69, color: 'purple', icon: 'orbit' },
  { id: 'linear-algebra', name: 'Linear Algebra', mastery: 73, color: 'blue', icon: 'grid' },
  { id: 'discrete-math', name: 'Discrete Math', mastery: 66, color: 'purple', icon: 'binary' },
]
