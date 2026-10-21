-- Topics: a two-level tree under each subject (topic > subtopic), plus an
-- optional topic on each card. Run this once in the Supabase SQL editor.
-- subjects.id is `text` in this project (see exams_table.sql note), so
-- subject_id is text. Topic ids are uuid.
-- Deleting a topic deletes its subtopics; cards keep existing and simply
-- become "no topic" (on delete set null), so no study data is ever lost.

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id text not null references public.subjects(id) on delete cascade,
  parent_id uuid references public.topics(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now()
);

create index if not exists topics_user_id_idx on public.topics(user_id);
create index if not exists topics_subject_id_idx on public.topics(subject_id);
create index if not exists topics_parent_id_idx on public.topics(parent_id) where parent_id is not null;

alter table public.topics enable row level security;

drop policy if exists "Users manage their own topics" on public.topics;
create policy "Users manage their own topics"
  on public.topics
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.cards
  add column if not exists topic_id uuid references public.topics(id) on delete set null;

create index if not exists cards_topic_id_idx on public.cards(topic_id) where topic_id is not null;
