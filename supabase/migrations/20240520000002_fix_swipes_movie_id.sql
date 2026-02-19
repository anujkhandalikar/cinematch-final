-- Fix swipes.movie_id: change from UUID (FK to movies table) to TEXT
-- This allows the app to use static local movie IDs (e.g. "1", "2") without needing
-- movies to be stored in the database.

-- 1. Drop the existing foreign key constraint
ALTER TABLE public.swipes
    DROP CONSTRAINT IF EXISTS swipes_movie_id_fkey;

-- 2. Change the column type from UUID to TEXT
ALTER TABLE public.swipes
    ALTER COLUMN movie_id TYPE text USING movie_id::text;
