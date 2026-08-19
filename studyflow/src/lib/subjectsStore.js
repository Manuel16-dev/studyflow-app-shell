// Subjects, backed by Supabase (`subjects` table, RLS-scoped to auth.uid()).
// Same function names as the old localStorage version — every call is now
// async, which is the one thing every caller had to change.
import { supabase } from './supabaseClient'
import { requireUserId } from './authHelpers'

export async function getSubjects() {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getSubject(id) {
  const { data, error } = await supabase.from('subjects').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function createSubject(subject) {
  const userId = await requireUserId()
  const { error } = await supabase.from('subjects').insert({ ...subject, user_id: userId })
  if (error) throw error
  return getSubjects()
}

export async function updateSubject(id, patch) {
  const { error } = await supabase
    .from('subjects')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
  return getSubjects()
}

export async function deleteSubject(id) {
  const { error } = await supabase.from('subjects').delete().eq('id', id)
  if (error) throw error
  return getSubjects()
}
