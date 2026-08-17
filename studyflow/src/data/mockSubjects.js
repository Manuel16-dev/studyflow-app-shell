// TODO: replace with real data from FastAPI/Supabase once backend is wired.
import { Sigma, Network, Zap, Orbit, Grid3x3, Binary } from 'lucide-react'

export const subjectColors = [
  { name: 'blue', bg: 'bg-primary', light: 'bg-primary-light' },
  { name: 'green', bg: 'bg-secondary', light: 'bg-secondary-light' },
  { name: 'orange', bg: 'bg-accent', light: 'bg-accent-light' },
  { name: 'purple', bg: 'bg-violet-500', light: 'bg-violet-100' },
]

export const mockSubjects = [
  { id: 'calculus', name: 'Calculus', cardCount: 231, mastery: 84, color: 'blue', icon: Sigma },
  { id: 'data-structures', name: 'Data Structures', cardCount: 180, mastery: 78, color: 'green', icon: Network },
  { id: 'electronics', name: 'Electronics', cardCount: 92, mastery: 61, color: 'orange', icon: Zap },
  { id: 'physics', name: 'Physics', cardCount: 156, mastery: 69, color: 'purple', icon: Orbit },
  { id: 'linear-algebra', name: 'Linear Algebra', cardCount: 98, mastery: 73, color: 'blue', icon: Grid3x3 },
  { id: 'discrete-math', name: 'Discrete Math', cardCount: 112, mastery: 66, color: 'purple', icon: Binary },
]
