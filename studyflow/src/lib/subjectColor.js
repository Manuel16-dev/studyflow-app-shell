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
  primary: { chipBg: 'bg-primary/15', accentBorder: 'border-l-4 border-primary', dot: 'bg-primary', text: 'text-primary' },
  secondary: { chipBg: 'bg-secondary/15', accentBorder: 'border-l-4 border-secondary', dot: 'bg-secondary', text: 'text-secondary' },
  accent: { chipBg: 'bg-accent/15', accentBorder: 'border-l-4 border-accent', dot: 'bg-accent', text: 'text-accent' },
  violet: { chipBg: 'bg-violet/15', accentBorder: 'border-l-4 border-violet', dot: 'bg-violet', text: 'text-violet' },
  info: { chipBg: 'bg-info/15', accentBorder: 'border-l-4 border-info', dot: 'bg-info', text: 'text-info' },
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
