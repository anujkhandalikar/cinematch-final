-- Add OTT streaming providers column to movies table
alter table public.movies
  add column if not exists ott_providers text[] default '{}';

-- Add a comment for documentation
comment on column public.movies.ott_providers is 'Array of OTT streaming platform names where this movie is available (e.g. Netflix, Amazon Prime Video)';
