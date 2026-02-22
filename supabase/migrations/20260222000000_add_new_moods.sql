-- Drop the existing check constraint on the mood column if it exists
ALTER TABLE public.movies DROP CONSTRAINT IF EXISTS movies_mood_check;

-- Add the new check constraint allowing the original 5 + the new 5 moods
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
    'whats_viral'
  )
);
