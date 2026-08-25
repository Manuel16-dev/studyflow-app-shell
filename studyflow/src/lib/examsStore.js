// Exams, backed by Supabase (`exams` table — see
// supabase-edge-function-reference/exams_table.sql). RLS-scoped to auth.uid(),
// same pattern as subjectsStore.js.
import { supabase } from './supabaseClient'
import { requireUserId } from './authHelpers'
import { getSubjectMastery } from './subjectsStore'

const MS_PER_DAY = 86400000

function rowToExam(row, subjectName, readiness) {
  const daysLeft = Math.max(0, Math.ceil((new Date(row.exam_date).getTime() - Date.now()) / MS_PER_DAY))
  return {
    id: row.id,
    name: row.name,
    subjectId: row.subject_id,
    subjectName,
    examDate: row.exam_date,
    daysLeft,
    // Real FSRS-derived readiness (see subjectsStore.getSubjectMastery) —
    // 0 if the subject has no cards yet, not a placeholder.
    readiness: readiness ?? 0,
  }
}

// All exams for the signed-in user, nearest first, with real readiness
// attached (subject-level FSRS mastery — there's no per-topic model yet,
// see cardsStore comments, so readiness is the whole subject's average
// recall probability, not a per-topic breakdown).
export async function getExams() {
  const [{ data, error }, mastery] = await Promise.all([
    supabase
      .from('exams')
      .select('id, subject_id, name, exam_date, subjects(name)')
      .order('exam_date', { ascending: true }),
    getSubjectMastery(),
  ])
  if (error) throw error
  return data.map((row) => rowToExam(row, row.subjects?.name, mastery[row.subject_id]))
}

export async function getExam(id) {
  const [{ data, error }, mastery] = await Promise.all([
    supabase.from('exams').select('id, subject_id, name, exam_date, subjects(name)').eq('id', id).maybeSingle(),
    getSubjectMastery(),
  ])
  if (error) throw error
  if (!data) return null
  return rowToExam(data, data.subjects?.name, mastery[data.subject_id])
}

export async function createExam({ subjectId, name, examDate }) {
  const userId = await requireUserId()
  const { error } = await supabase
    .from('exams')
    .insert({ user_id: userId, subject_id: subjectId, name, exam_date: examDate })
  if (error) throw error
  return getExams()
}

export async function deleteExam(id) {
  const { error } = await supabase.from('exams').delete().eq('id', id)
  if (error) throw error
  return getExams()
}
