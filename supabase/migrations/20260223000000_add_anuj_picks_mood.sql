-- Drop the existing check constraint on the mood column
ALTER TABLE public.movies DROP CONSTRAINT IF EXISTS movies_mood_check;

-- Add updated constraint including the new anuj_picks mood
ALTER TABLE public.movies ADD CONSTRAINT movies_mood_check CHECK (
  mood IN (
    'imdb_top',
    'light_and_fun',
    'bollywood',
    'oscar',
    'srk',
    'latest',
    'gritty_thrillers',
    'quick_watches',
    'reality_and_drama',
    'whats_viral',
    'anuj_picks'
  )
);
