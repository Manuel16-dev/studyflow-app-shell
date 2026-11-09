// Saved Flow Buddy chats: one rolling thread per subject (table: tutor_messages).
import { supabase } from './supabaseClient'

const LOAD_LIMIT = 30

// Oldest first, ready to drop into the chat.
export async function getTutorHistory(subjectId) {
  const { data, error } = await supabase
    .from('tutor_messages')
    .select('role, content, grounded, created_at')
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: false })
    .limit(LOAD_LIMIT)
  if (error) throw error
  return data.reverse().map((m) => ({
    role: m.role,
    content: m.content,
    ...(m.grounded === null ? {} : { grounded: m.grounded }),
  }))
}

// Saved only after an answer finishes, so threads always hold whole exchanges.
export async function saveTutorExchange(subjectId, question, answer, grounded) {
  const t = Date.now()
  const { error } = await supabase.from('tutor_messages').insert([
    { subject_id: subjectId, role: 'user', content: question, created_at: new Date(t).toISOString() },
    { subject_id: subjectId, role: 'assistant', content: answer, grounded, created_at: new Date(t + 1).toISOString() },
  ])
  if (error) throw error
}

export async function clearTutorHistory(subjectId) {
  const { error } = await supabase.from('tutor_messages').delete().eq('subject_id', subjectId)
  if (error) throw error
}
