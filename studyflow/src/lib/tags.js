// Card tags: short free-form labels, stored lowercase on cards.tags (text[]).
export const MAX_TAGS = 8
export const MAX_TAG_LENGTH = 24

// Trim, lowercase, collapse spaces; empty or over-long becomes null.
export function normalizeTag(raw) {
  const tag = String(raw ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
  return tag && tag.length <= MAX_TAG_LENGTH ? tag : null
}

// Normalise a list, drop blanks and duplicates, and cap at MAX_TAGS.
export function normalizeTags(list) {
  const out = []
  for (const raw of list ?? []) {
    const tag = normalizeTag(raw)
    if (tag && !out.includes(tag)) out.push(tag)
  }
  return out.slice(0, MAX_TAGS)
}

// Tag -> number of cards using it, most used first (ties alphabetical).
export function tagCounts(cards) {
  const counts = new Map()
  for (const c of cards) for (const t of c.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}
