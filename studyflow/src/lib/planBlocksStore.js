// Study plan blocks, backed by Supabase (`plan_blocks` table — see
// sql/plan_blocks_table.sql). RLS-scoped to auth.uid(), same pattern as
// subjectsStore/examsStore. Replaces src/data/mockPlan.js.
//
// Schema decision: blocks are stored with a real `block_date`, not a
// dayOffset. dayOffset (0 = today, 1 = tomorrow, ...) is a *derived* view
// for the 5-day Planner grid, computed client-side against "today" —
// same relationship exams has between exam_date and daysLeft.
import { supabase } from './supabaseClient'
import { requireUserId } from './authHelpers'

const MS_PER_DAY = 86400000

function todayStart() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function offsetToDateStr(offset) {
  const d = todayStart()
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
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

export function weekdayLabel(dayOffset) {
  const d = todayStart()
  d.setDate(d.getDate() + dayOffset)
  return {
    weekday: d.toLocaleDateString(undefined, { weekday: 'short' }),
    date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    isToday: dayOffset === 0,
  }
}

// All blocks in the 5-day window the Planner grid shows (today .. today+4).
export async function getPlanBlocksForWeek() {
  const start = offsetToDateStr(0)
  const end = offsetToDateStr(4)
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
  const { data, error } = await supabase
    .from('plan_blocks')
    .select('*')
    .eq('block_date', offsetToDateStr(0))
  if (error) throw error
  return data.map(rowToBlock)
}

export async function createPlanBlock({ subjectId, title, dayOffset, time, duration }) {
  const userId = await requireUserId()
  const { error } = await supabase.from('plan_blocks').insert({
    user_id: userId,
    subject_id: subjectId || null,
    title,
    block_date: offsetToDateStr(dayOffset),
    time,
    duration,
  })
  if (error) throw error
  return getPlanBlocksForWeek()
}

export async function updatePlanBlock(id, { dayOffset, time }) {
  const { error } = await supabase
    .from('plan_blocks')
    .update({ block_date: offsetToDateStr(dayOffset), time, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
  return getPlanBlocksForWeek()
}

export async function deletePlanBlock(id) {
  const { error } = await supabase.from('plan_blocks').delete().eq('id', id)
  if (error) throw error
  return getPlanBlocksForWeek()
}
