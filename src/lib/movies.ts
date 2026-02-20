import { createClient } from "./supabase/client"

export type Mood = "imdb_top" | "light_and_fun" | "bollywood" | "oscar" | "srk"

export interface Movie {
    id: string
    title: string
    poster_url: string
    genre: string[]
    year: number
    overview: string
    imdb_rating: number
    mood: Mood
}

const supabase = createClient()

/**
 * Fetch movies from Supabase, optionally filtered by mood.
 */
export async function fetchMovies(mood?: Mood, limit = 20): Promise<Movie[]> {
    let query = supabase
        .from("movies")
        .select("id, title, poster_url, genre, year, overview, imdb_rating, mood")
        .limit(limit)

    if (mood) {
        query = query.eq("mood", mood)
    }

    const { data, error } = await query

    if (error) {
        console.error("Failed to fetch movies:", error)
        return []
    }

    return (data ?? []) as Movie[]
}

/**
 * Fetch movies by mood from Supabase.
 */
export async function getMoviesByMood(mood: Mood): Promise<Movie[]> {
    return fetchMovies(mood, 50)
}

/**
 * Fetch movies for multiple moods (OR logic), deduplicated by id.
 * Results are sorted by id for a stable, deterministic base order.
 */
export async function getMoviesByMoods(moods: Mood[]): Promise<Movie[]> {
    const unique = [...new Set(moods)]
    if (unique.length === 0) return []

    const { data, error } = await supabase
        .from("movies")
        .select("id, title, poster_url, genre, year, overview, imdb_rating, mood")
        .in("mood", unique)
        .order("id", { ascending: true })

    if (error) {
        console.error("Failed to fetch movies by moods:", error)
        return []
    }

    return (data ?? []) as Movie[]
}

/**
 * Fetch specific movies by their IDs from Supabase.
 */
export async function getMoviesByIds(ids: string[]): Promise<Movie[]> {
    if (ids.length === 0) return []

    const { data, error } = await supabase
        .from("movies")
        .select("id, title, poster_url, genre, year, overview, imdb_rating, mood")
        .in("id", ids)

    if (error) {
        console.error("Failed to fetch movies by IDs:", error)
        return []
    }

    return (data ?? []) as Movie[]
}

/**
 * Mulberry32 seeded PRNG — produces a deterministic float in [0, 1)
 * from a 32-bit integer state.
 */
function mulberry32(seed: number): () => number {
    let s = seed | 0
    return () => {
        s = (s + 0x6d2b79f5) | 0
        let t = Math.imul(s ^ (s >>> 15), 1 | s)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

/**
 * Convert an arbitrary string seed into a 32-bit integer via simple hash.
 */
function hashSeed(seed: string): number {
    let h = 0
    for (let i = 0; i < seed.length; i++) {
        h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
    }
    return h
}

/**
 * Deterministic Fisher-Yates shuffle using a string seed.
 * Given the same array contents and the same seed, the output order
 * is always identical across all clients.
 */
export function shuffleWithSeed<T>(array: T[], seed: string): T[] {
    const arr = [...array]
    const rng = mulberry32(hashSeed(seed))
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
}
