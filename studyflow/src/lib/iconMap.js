// Subjects are persisted as plain JSON (see subjectsStore.js), so icons are
// stored as string keys, not component references. This map resolves a key
// to the actual lucide component for rendering.
import { Sigma, Network, Zap, Orbit, Grid3x3, Binary, BookOpen } from 'lucide-react'

export const iconMap = {
  sigma: Sigma,
  network: Network,
  zap: Zap,
  orbit: Orbit,
  grid: Grid3x3,
  binary: Binary,
  book: BookOpen,
}

export function resolveIcon(key) {
  return iconMap[key] ?? BookOpen
}
