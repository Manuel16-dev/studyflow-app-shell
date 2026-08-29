-- Real `plan_blocks` table. Run this in the Supabase SQL editor.
-- Mirrors the exams/subjects pattern: uuid PK, user_id owns the row,
-- RLS scoped to auth.uid(). subject_id is text (nullable — a block can be
-- a general "Flashcard Review Session" not tied to one subject) to match
-- subjects.id, which is text in this project (see exams_table.sql note).
--
-- Schema decision: ONE-OFF DATED BLOCKS, not recurring weekly templates.
-- Blocks are generated from what's due (FSRS) and exam proximity, which
-- changes week to week — a fixed weekly slot doesn't fit that. Storing a
-- real block_date (not a day-of-week + offset) also avoids treating a
-- derived "day 0 = today" concept as if it were the source of truth.

create table if not exists public.plan_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id text references public.subjects(id) on delete cascade,
  title text not null,
  block_date date not null,
  time text not null,
  duration text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plan_blocks_user_id_idx on public.plan_blocks(user_id);
create index if not exists plan_blocks_block_date_idx on public.plan_blocks(block_date);

alter table public.plan_blocks enable row level security;

create policy "Users manage their own plan blocks"
  on public.plan_blocks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
