-- Real `exams` table. Run this in the Supabase SQL editor.
-- Mirrors the `subjects` table pattern already in use: uuid PK,
-- user_id owns the row, RLS scoped to auth.uid().
-- NOTE: subjects.id is `text` in this project (not uuid), so subject_id
-- below is text to match — confirmed via the 42804 FK type-mismatch error.

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id text not null references public.subjects(id) on delete cascade,
  name text not null,
  exam_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists exams_user_id_idx on public.exams(user_id);
create index if not exists exams_subject_id_idx on public.exams(subject_id);

alter table public.exams enable row level security;

create policy "Users manage their own exams"
  on public.exams
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
