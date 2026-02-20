-- Add shared seed to rooms for deterministic deck shuffling in dual mode.
-- Required: run this migration (e.g. Supabase Dashboard SQL editor or: supabase db push)
-- so that rooms.insert({ seed }) does not return PGRST204.
alter table public.rooms add column if not exists seed text;

-- Add mood to participants so each player's mood choice is persisted.
alter table public.participants add column if not exists mood text;
