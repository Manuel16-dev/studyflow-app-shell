-- Reminder functions are only called by Edge Functions using the service role.
revoke execute on function public.get_due_custom_reminders() from public, anon, authenticated;
revoke execute on function public.mark_custom_reminder_sent(uuid) from public, anon, authenticated;
grant execute on function public.get_due_custom_reminders() to service_role;
grant execute on function public.mark_custom_reminder_sent(uuid) to service_role;

alter function public.get_due_push_targets() set search_path = public;
