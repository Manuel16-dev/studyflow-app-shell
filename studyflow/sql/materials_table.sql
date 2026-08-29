-- Materials + chunk coverage (AI card generation, "generate more" feature).
-- Run this in the Supabase SQL editor, then create the storage bucket below
-- via the dashboard (Storage -> New bucket) since bucket creation isn't
-- reliably scriptable across Supabase versions.
--
-- subjects.id is `text` in this project (not uuid) — see exams_table.sql.

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id text not null references public.subjects(id) on delete cascade,
  name text not null,
  storage_path text not null,
  -- Full extracted text, capped client-side at 400k chars (materialText.js).
  -- Stored so "generate more" later doesn't need to re-download + re-parse
  -- the raw file — chunking always re-derives from this column.
  extracted_text text not null,
  created_at timestamptz not null default now()
);

create index if not exists materials_user_id_idx on public.materials(user_id);
create index if not exists materials_subject_id_idx on public.materials(subject_id);

alter table public.materials enable row level security;

create policy "Users manage their own materials"
  on public.materials
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- One row per chunk (same chunking the Edge Function already does).
-- `covered` flips to true the first time a generation pass successfully
-- produces cards from that chunk — regardless of whether the user later
-- approves or discards them. This is a deliberate simplification: tracking
-- "covered" at approve-time instead would need candidate cards to carry
-- their source chunk index through the whole review flow. The tradeoff is
-- a chunk that only ever yields discarded cards stays marked covered and
-- won't be retried — acceptable for now, flagged here if it needs revisiting.
create table if not exists public.material_chunks (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materials(id) on delete cascade,
  chunk_index int not null,
  covered boolean not null default false,
  card_count int not null default 0,
  created_at timestamptz not null default now(),
  unique (material_id, chunk_index)
);

create index if not exists material_chunks_material_id_idx on public.material_chunks(material_id);

alter table public.material_chunks enable row level security;

-- No user_id column here — ownership is via the parent material.
create policy "Users manage chunks of their own materials"
  on public.material_chunks
  for all
  using (exists (select 1 from public.materials m where m.id = material_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.materials m where m.id = material_id and m.user_id = auth.uid()));

-- --- Storage bucket -----------------------------------------------------
-- Create a private bucket named "materials" via Dashboard -> Storage.
-- Files are stored at `${user_id}/${material_id}/${filename}` so the path
-- itself enforces per-user scoping; policies below double-check via RLS.

create policy "Users manage their own material files"
  on storage.objects
  for all
  using (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'materials' and (storage.foldername(name))[1] = auth.uid()::text);
