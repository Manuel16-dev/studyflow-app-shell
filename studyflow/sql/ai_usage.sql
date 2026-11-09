-- Per user daily AI usage cap. Limits live in the Edge Functions (so they can
-- be tuned without a migration); this only counts and enforces atomically.
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  kind text not null,
  calls integer not null default 0,
  primary key (user_id, day, kind)
);

-- No policies on purpose: clients can't read or write this table directly.
-- Only consume_ai_quota (security definer) touches it.
alter table public.ai_usage enable row level security;

-- Returns true and counts the call if the signed in user is under p_limit
-- for this kind today (UTC). Returns false at the limit or when signed out.
create or replace function public.consume_ai_quota(p_kind text, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  used integer;
begin
  if uid is null or p_limit < 1 then
    return false;
  end if;

  insert into public.ai_usage as u (user_id, day, kind, calls)
  values (uid, current_date, p_kind, 1)
  on conflict (user_id, day, kind)
  do update set calls = u.calls + 1
  where u.calls < p_limit
  returning u.calls into used;

  return used is not null;
end;
$$;

revoke all on function public.consume_ai_quota(text, integer) from public, anon;
grant execute on function public.consume_ai_quota(text, integer) to authenticated;
