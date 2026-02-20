-- Comprehensive migration to align DB schema with application code.
-- The init migration used (rooms.code, participants.room_code, participants.last_seen)
-- but the app expects (rooms.id, participants.room_id, participants.is_ready, participants.joined_at, etc.)

-- ============================================================
-- ROOMS: rename PK from "code" to "id", add missing columns
-- ============================================================

-- Rename rooms.code -> rooms.id (if "code" exists as the PK column)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'rooms' AND column_name = 'code'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'rooms' AND column_name = 'id'
    ) THEN
        ALTER TABLE public.rooms RENAME COLUMN code TO id;
    END IF;
END $$;

-- Add rooms.created_by if missing
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS created_by uuid;

-- Add rooms.started_at if missing
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS started_at timestamptz;

-- Add rooms.seed if missing
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS seed text;

-- ============================================================
-- PARTICIPANTS: rename columns, add missing ones
-- ============================================================

-- Rename participants.room_code -> participants.room_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'participants' AND column_name = 'room_code'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'participants' AND column_name = 'room_id'
    ) THEN
        ALTER TABLE public.participants RENAME COLUMN room_code TO room_id;
    END IF;
END $$;

-- Rename participants.last_seen -> participants.joined_at
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'participants' AND column_name = 'last_seen'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'participants' AND column_name = 'joined_at'
    ) THEN
        ALTER TABLE public.participants RENAME COLUMN last_seen TO joined_at;
    END IF;
END $$;

-- Add participants.is_ready if missing
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS is_ready boolean DEFAULT false;

-- Add participants.mood if missing
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS mood text;

-- Add unique constraint on (room_id, user_id) if not already present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.participants'::regclass
        AND contype = 'u'
        AND conname = 'participants_room_id_user_id_key'
    ) THEN
        ALTER TABLE public.participants ADD CONSTRAINT participants_room_id_user_id_key UNIQUE (room_id, user_id);
    END IF;
END $$;

-- ============================================================
-- SWIPES: rename room_code -> room_id
-- ============================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'swipes' AND column_name = 'room_code'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'swipes' AND column_name = 'room_id'
    ) THEN
        ALTER TABLE public.swipes RENAME COLUMN room_code TO room_id;
    END IF;
END $$;
