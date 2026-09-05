// Study plan blocks, backed by Supabase (`plan_blocks` table — see
// sql/plan_blocks_table.sql). RLS-scoped to auth.uid(), same pattern as
// subjectsStore/examsStore. Replaces src/data/mockPlan.js.
//
// Schema: blocks are stored with a real `block_date`. Create/update now take
// that date directly (previously they took a 0-4 dayOffset for the old 5-day
// week grid — that stopped making sense once Planner moved to a month-grid
// view, since most days in a month sit outside a 0-4 offset window).
// `dayOffset` is kept on the returned block shape as a derived convenience
// (0 = today) for anything that still wants it, e.g. "is this today".
import { supabase } from './supabaseClient'
import { requireUserId } from './authHelpers'

const MS_PER_DAY = 86400000

function todayStart() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function dateStrToOffset(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  return Math.round((d.getTime() - todayStart().getTime()) / MS_PER_DAY)
}

function rowToBlock(row) {
  return {
    id: row.id,
    dayOffset: dateStrToOffset(row.block_date),
    blockDate: row.block_date,
    time: row.time,
    duration: row.duration,
    title: row.title,
    subjectId: row.subject_id,
  }
}

// First/last day (YYYY-MM-DD) of the given month. month is 0-indexed (Date convention).
function monthRange(year, month) {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  return { start: first.toISOString().slice(0, 10), end: last.toISOString().slice(0, 10) }
}

// All blocks whose block_date falls within the given month — powers the
// month-grid view. month is 0-indexed.
export async function getPlanBlocksForMonth(year, month) {
  const { start, end } = monthRange(year, month)
  const { data, error } = await supabase
    .from('plan_blocks')
    .select('*')
    .gte('block_date', start)
    .lte('block_date', end)
  if (error) throw error
  return data.map(rowToBlock)
}

// Just today's blocks, for the Dashboard "Study Plan for Today" card.
export async function getTodaysPlanBlocks() {
  const todayStr = todayStart().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('plan_blocks')
    .select('*')
    .eq('block_date', todayStr)
  if (error) throw error
  return data.map(rowToBlock)
}

export async function createPlanBlock({ subjectId, title, blockDate, time, duration }) {
  const userId = await requireUserId()
  const { error } = await supabase.from('plan_blocks').insert({
    user_id: userId,
    subject_id: subjectId || null,
    title,
    block_date: blockDate,
    time,
    duration,
  })
  if (error) throw error
}

export async function updatePlanBlock(id, { blockDate, time }) {
  const { error } = await supabase
    .from('plan_blocks')
    .update({ block_date: blockDate, time, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deletePlanBlock(id) {
  const { error } = await supabase.from('plan_blocks').delete().eq('id', id)
  if (error) throw error
}
