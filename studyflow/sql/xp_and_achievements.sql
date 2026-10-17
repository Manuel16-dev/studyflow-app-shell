-- Gamification (PRD section 39): XP is DERIVED from review_logs + study_sessions
-- (no ledger), so it counts existing history and never needs write-path changes.
-- The only stored XP is one-time achievement bonuses in user_achievements.
-- Already applied to the StudyFlow project as migration `xp_and_achievements`;
-- kept here for the repo, same as the other files in sql/.
--
-- Formula (locked):
--   per review  = base(rating: Again 3, Hard 7, Good 10, Easy 10)
--                 x timing factor (elapsed / previous stability:
--                   first review or >= 0.8 -> 1.0, 0.3..0.8 -> 0.5, < 0.3 -> 0.1)
--   daily cap   = 400 review XP per day (in the user's timezone)
--   goal bonus  = +50 on days with study time >= daily goal (min 10 min)
--                 AND at least 50 review XP that day
--   level       = floor(sqrt(total_xp / 100)) + 1  (computed client-side, xpStore.js)

create index if not exists review_logs_user_card_time_idx
  on public.review_logs (user_id, card_id, reviewed_at);

create table if not exists public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  xp integer not null default 0 check (xp >= 0 and xp <= 500),
  unlocked_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.user_achievements enable row level security;

create policy "Users read their own achievements"
  on public.user_achievements for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users unlock their own achievements"
  on public.user_achievements for insert to authenticated
  with check ((select auth.uid()) = user_id);

create or replace function public.get_xp_summary()
returns table (
  total_xp bigint,
  today_xp bigint,
  review_xp bigint,
  goal_bonus_xp bigint,
  achievement_xp bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with base as (
    select
      auth.uid() as uid,
      greatest(
        case when (s.study_behavior ->> 'dailyTargetMinutes') ~ '^[0-9]{1,4}$'
             then (s.study_behavior ->> 'dailyTargetMinutes')::int end,
        10
      ) as goal_min,
      coalesce(
        (select z.name from pg_catalog.pg_timezone_names z
          where z.name = coalesce(nullif(s.study_behavior ->> 'timezone', ''), p.timezone)
          limit 1),
        'UTC'
      ) as tz
    from (select 1) one
    left join public.settings s on s.user_id = auth.uid()
    left join public.profiles p on p.id = auth.uid()
  ),
  cfg as (
    select uid, coalesce(goal_min, 30) as goal_min, tz, (now() at time zone tz)::date as today
    from base
  ),
  logs as (
    select rl.id, rl.rating, rl.reviewed_at,
           lag(rl.reviewed_at) over w as prev_at,
           lag(rl.stability_after) over w as prev_stability
    from public.review_logs rl
    where rl.user_id = (select uid from cfg)
    window w as (partition by rl.card_id order by rl.reviewed_at, rl.id)
  ),
  scored as (
    select l.id, l.reviewed_at,
           (l.reviewed_at at time zone c.tz)::date as day,
           (case l.rating when 1 then 3 when 2 then 7 when 3 then 10 when 4 then 10 else 0 end)::numeric
           * (case
               when l.prev_at is null or l.prev_stability is null or l.prev_stability <= 0 then 1.0
               when (extract(epoch from (l.reviewed_at - l.prev_at)) / 86400.0) / l.prev_stability >= 0.8 then 1.0
               when (extract(epoch from (l.reviewed_at - l.prev_at)) / 86400.0) / l.prev_stability >= 0.3 then 0.5
               else 0.1
             end) as raw_xp
    from logs l cross join cfg c
  ),
  capped as (
    select id, day, reviewed_at,
           least(
             raw_xp,
             greatest(0, 400 - coalesce(sum(raw_xp) over (
               partition by day order by reviewed_at, id
               rows between unbounded preceding and 1 preceding), 0))
           ) as xp
    from scored
  ),
  daily as (
    select day, sum(xp) as day_xp from capped group by day
  ),
  sessions as (
    select (ss.started_at at time zone c.tz)::date as day, sum(ss.duration_seconds) as secs
    from public.study_sessions ss cross join cfg c
    where ss.user_id = c.uid
    group by 1
  ),
  bonus as (
    select d.day, 50 as xp
    from daily d
    join sessions s on s.day = d.day
    cross join cfg c
    where d.day_xp >= 50 and s.secs >= c.goal_min * 60
  ),
  rev as (
    select coalesce(sum(day_xp), 0) as total,
           coalesce(sum(day_xp) filter (where day = (select today from cfg)), 0) as today
    from daily
  ),
  bon as (
    select coalesce(sum(xp), 0) as total,
           coalesce(sum(xp) filter (where day = (select today from cfg)), 0) as today
    from bonus
  ),
  ach as (
    select coalesce(sum(a.xp), 0) as total,
           coalesce(sum(a.xp) filter (
             where (a.unlocked_at at time zone c.tz)::date = c.today), 0) as today
    from public.user_achievements a cross join cfg c
    where a.user_id = c.uid
  )
  select
    round(rev.total + bon.total + ach.total)::bigint,
    round(rev.today + bon.today + ach.today)::bigint,
    round(rev.total)::bigint,
    round(bon.total)::bigint,
    round(ach.total)::bigint
  from rev, bon, ach;
$$;

revoke execute on function public.get_xp_summary() from public, anon;
grant execute on function public.get_xp_summary() to authenticated;
