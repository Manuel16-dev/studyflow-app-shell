-- Saved Flow Buddy chats: one rolling thread per user per subject.
create table if not exists public.tutor_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  subject_id text not null references public.subjects(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) <= 8000),
  grounded boolean,
  created_at timestamptz not null default now()
);

create index if not exists tutor_messages_thread_idx
  on public.tutor_messages (user_id, subject_id, created_at desc);

alter table public.tutor_messages enable row level security;

create policy "tutor_messages_select_own" on public.tutor_messages
  for select to authenticated using (user_id = (select auth.uid()));
create policy "tutor_messages_insert_own" on public.tutor_messages
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "tutor_messages_delete_own" on public.tutor_messages
  for delete to authenticated using (user_id = (select auth.uid()));
-- No update policy: messages are written once and cleared with "New chat".
