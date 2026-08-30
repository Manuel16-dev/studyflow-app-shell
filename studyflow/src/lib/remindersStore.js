// User-created reminders ("remind me about X at Y") — distinct from the
// automatic review-due and exam-deadline reminders. Delivered by the
// isolated send-custom-reminders Edge Function + its own cron job, so a
// problem here can't affect the review-reminder pipeline.
import { supabase } from './supabaseClient'
import { requireUserId } from './authHelpers'

export async function getUpcomingReminders() {
  const { data, error } = await supabase
    .from('custom_reminders')
    .select('*')
    .eq('sent', false)
    .order('remind_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createReminder(title, remindAtIso) {
  const userId = await requireUserId()
  const { error } = await supabase
    .from('custom_reminders')
    .insert({ user_id: userId, title, remind_at: remindAtIso })
  if (error) throw error
}

export async function deleteReminder(id) {
  const { error } = await supabase.from('custom_reminders').delete().eq('id', id)
  if (error) throw error
}
