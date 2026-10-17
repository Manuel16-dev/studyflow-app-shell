-- Per-card source reference + card kind (AI generation pass).
-- Already applied to the StudyFlow project as migration `card_sources_and_kind`;
-- kept here for the repo, same as the other files in sql/.
alter table public.cards
  add column if not exists material_id uuid references public.materials(id) on delete set null,
  add column if not exists chunk_index integer,
  add column if not exists source_ref text,
  add column if not exists kind text not null default 'flashcard' check (kind in ('flashcard', 'practice'));

create index if not exists cards_material_id_idx on public.cards (material_id) where material_id is not null;
