// Deterministic subject -> color mapping, built entirely on tokens that
// already exist in index.css (@theme + html.dark overrides), so this needs
// zero new CSS and works in both themes automatically.
//
// Classes are spelled out in full (not built with template strings) because
// Tailwind's scanner only picks up class names it can see literally in
// source — `bg-${key}-light` would silently produce no CSS.
//
// `danger` is intentionally excluded: that token is reserved for exam
// deadlines elsewhere in Planner, so reusing it for a subject would make a
// study block look like an overdue exam.
const PALETTE = {
  primary: { bg: 'bg-primary-light', border: 'border-primary/30', borderHover: 'hover:border-primary', text: 'text-primary', dot: 'bg-primary' },
  secondary: { bg: 'bg-secondary-light', border: 'border-secondary/30', borderHover: 'hover:border-secondary', text: 'text-secondary', dot: 'bg-secondary' },
  accent: { bg: 'bg-accent-light', border: 'border-accent/30', borderHover: 'hover:border-accent', text: 'text-accent', dot: 'bg-accent' },
  violet: { bg: 'bg-violet-light', border: 'border-violet/30', borderHover: 'hover:border-violet', text: 'text-violet', dot: 'bg-violet' },
  info: { bg: 'bg-info-light', border: 'border-info/30', borderHover: 'hover:border-info', text: 'text-info', dot: 'bg-info' },
}
const KEYS = Object.keys(PALETTE)

// Simple string hash (djb2-ish) — stable across sessions since it's a pure
// function of the id, no randomness, no storage needed.
export function getSubjectColor(subjectId) {
  if (!subjectId) return PALETTE.primary
  let hash = 0
  for (let i = 0; i < subjectId.length; i++) {
    hash = (hash * 31 + subjectId.charCodeAt(i)) >>> 0
  }
  return PALETTE[KEYS[hash % KEYS.length]]
}
