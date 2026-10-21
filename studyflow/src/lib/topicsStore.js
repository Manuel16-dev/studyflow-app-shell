// Topics: a two-level tree under each subject (topic > subtopic), backed by
// the `topics` table (RLS-scoped to auth.uid()). Cards optionally point at a
// topic through cards.topic_id. See sql/topics_table.sql.
import { supabase } from './supabaseClient'
import { requireUserId } from './authHelpers'
import { retrievability } from './fsrs'

const MS_PER_DAY = 86400000
export const MAX_TOPIC_NAME = 80

export async function getTopics(subjectId) {
  const { data, error } = await supabase
    .from('topics')
    .select('id, subject_id, parent_id, name')
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

// Flat list -> [{ ...topic, children: [...] }]. Orphans (a parent that no
// longer exists) are promoted to the top level rather than hidden.
export function buildTopicTree(flat) {
  const byId = new Map(flat.map((t) => [t.id, { ...t, children: [] }]))
  const roots = []
  for (const node of byId.values()) {
    const parent = node.parent_id ? byId.get(node.parent_id) : null
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  return roots
}

// A topic's own id plus every descendant id: used so picking a parent topic
// also shows the cards filed under its subtopics.
export function topicIdsWithChildren(flat, topicId) {
  const ids = new Set([topicId])
  for (const t of flat) if (t.parent_id === topicId) ids.add(t.id)
  return ids
}

// "Parent › Child" label for pickers and badges.
export function topicLabel(flat, topicId) {
  const t = flat.find((x) => x.id === topicId)
  if (!t) return null
  const parent = t.parent_id ? flat.find((x) => x.id === t.parent_id) : null
  return parent ? `${parent.name} › ${t.name}` : t.name
}

function cleanName(name) {
  const clean = String(name ?? '').trim().replace(/\s+/g, ' ')
  if (!clean) throw new Error('Topic name is required.')
  if (clean.length > MAX_TOPIC_NAME) throw new Error(`Topic names can be up to ${MAX_TOPIC_NAME} characters.`)
  return clean
}

export async function createTopic(subjectId, name, parentId = null) {
  const userId = await requireUserId()
  const clean = cleanName(name)
  if (parentId) {
    // Depth cap: a subtopic can't have subtopics of its own.
    const { data: parent, error: pErr } = await supabase
      .from('topics')
      .select('id, parent_id')
      .eq('id', parentId)
      .maybeSingle()
    if (pErr) throw pErr
    if (!parent) throw new Error('That topic no longer exists.')
    if (parent.parent_id) throw new Error('Subtopics can’t have their own subtopics.')
  }
  const { error } = await supabase
    .from('topics')
    .insert({ subject_id: subjectId, user_id: userId, parent_id: parentId, name: clean })
  if (error) throw error
  return getTopics(subjectId)
}

export async function renameTopic(subjectId, topicId, name) {
  const { error } = await supabase.from('topics').update({ name: cleanName(name) }).eq('id', topicId)
  if (error) throw error
  return getTopics(subjectId)
}

// Deleting a topic also deletes its subtopics (FK cascade). Cards are kept
// and become "no topic" (FK set null).
export async function deleteTopic(subjectId, topicId) {
  const { error } = await supabase.from('topics').delete().eq('id', topicId)
  if (error) throw error
  return getTopics(subjectId)
}

// Per-topic card count and live FSRS mastery for one subject, with each
// subtopic rolled up into its parent. Same convention as subject mastery:
// never-reviewed cards count as 0%, so an unstudied topic isn't "mastered".
// Returns { [topicId]: { cardCount, mastery } } (mastery null when no cards)
// plus the special key 'none' for cards with no topic.
export async function getTopicStats(subjectId, topics) {
  const { data, error } = await supabase
    .from('cards')
    .select('id, topic_id, reviews(stability, last_review)')
    .eq('subject_id', subjectId)
  if (error) throw error

  const now = Date.now()
  const direct = {} // topicId | 'none' -> { count, sum }
  for (const row of data) {
    const key = row.topic_id ?? 'none'
    const review = Array.isArray(row.reviews) ? row.reviews[0] : row.reviews
    let r = 0
    if (review?.stability != null) {
      const elapsedDays = review.last_review ? (now - new Date(review.last_review).getTime()) / MS_PER_DAY : 0
      r = retrievability(elapsedDays, review.stability)
    }
    const slot = (direct[key] ??= { count: 0, sum: 0 })
    slot.count += 1
    slot.sum += r
  }

  const stats = {}
  const finish = (count, sum) => ({ cardCount: count, mastery: count ? Math.round((sum / count) * 100) : null })
  for (const t of topics) {
    let count = 0
    let sum = 0
    for (const id of topicIdsWithChildren(topics, t.id)) {
      count += direct[id]?.count ?? 0
      sum += direct[id]?.sum ?? 0
    }
    stats[t.id] = finish(count, sum)
  }
  stats.none = finish(direct.none?.count ?? 0, direct.none?.sum ?? 0)
  return stats
}
