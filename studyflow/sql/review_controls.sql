-- Review controls: suspend a card so it stays in the deck but never shows
-- up in review or practice. Run once in the Supabase SQL editor.
-- Daily new/review limits need no SQL: they live in settings.study_behavior
-- (newCardsPerDay, maxReviewsPerDay).

alter table public.cards
  add column if not exists suspended boolean not null default false;

create index if not exists cards_suspended_idx on public.cards(user_id) where suspended;
