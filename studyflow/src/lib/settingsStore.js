// Settings, backed by Supabase (`settings` table, one row per user, created
// automatically by the handle_new_user trigger on signup).
import { supabase } from './supabaseClient'
import { requireUserId } from './authHelpers'

function rowToSettings(row) {
  if (!row) return null
  return { studyBehavior: row.study_behavior, notifications: row.notifications, appearance: row.appearance }
}

const columnMap = { studyBehavior: 'study_behavior', notifications: 'notifications', appearance: 'appearance' }

export async function getSettings() {
  const userId = await requireUserId()
  const { data, error } = await supabase.from('settings').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return rowToSettings(data)
}

// Shallow-merges a patch into one section (studyBehavior | notifications | appearance).
export async function updateSettingsSection(section, patch) {
  const userId = await requireUserId()
  const column = columnMap[section]
  const current = await getSettings()
  const merged = { ...(current?.[section] ?? {}), ...patch }
  const { error } = await supabase
    .from('settings')
    .update({ [column]: merged, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
  if (error) throw error
  return getSettings()
}
