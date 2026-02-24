import { createClient } from "./supabase/client"

export type Mood = "imdb_top" | "light_and_fun" | "bollywood" | "oscar" | "srk" | "latest" | "gritty_thrillers" | "quick_watches" | "reality_and_drama" | "whats_viral" | "anuj_picks"

export interface Movie {
    id: string
    title: string
    poster_url: string
    genre: string[]
    year: number
    overview: string
    imdb_rating: number
    mood: Mood
    ott_providers: string[]
    media_type?: string
}

const supabase = createClient()

/**
 * Fetch movies from Supabase, optionally filtered by mood.
 */
export async function fetchMovies(mood?: Mood, limit = 20): Promise<Movie[]> {
    let query = supabase
        .from("movies")
        .select("id, title, poster_url, genre, year, overview, imdb_rating, mood, ott_providers")
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
    return fetchMovies(mood, 100)
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
        .select("id, title, poster_url, genre, year, overview, imdb_rating, mood, ott_providers")
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
        .select("id, title, poster_url, genre, year, overview, imdb_rating, mood, ott_providers")
        .in("id", ids)

    if (error) {
        console.error("Failed to fetch movies by IDs:", error)
        return []
    }

    return (data ?? []) as Movie[]
}

const ALL_MOODS: Mood[] = ["imdb_top", "light_and_fun", "bollywood", "oscar", "srk", "latest", "gritty_thrillers", "quick_watches", "reality_and_drama", "whats_viral", "anuj_picks"]

// "_all" is the key used for the AI-mode (no mood filter) provider list
type ProviderCacheKey = Mood | "_all"
type ProviderCache = Record<ProviderCacheKey, string[]>

const OTT_CACHE_KEY = "ott_cache_v1"

async function fetchProvidersDirect(mood?: Mood): Promise<string[]> {
    let query = supabase
        .from("movies")
        .select("ott_providers")

    if (mood) {
        query = query.eq("mood", mood)
    }

    const { data, error } = await query

    if (error) {
        console.error("Failed to fetch providers:", error)
        return []
    }

    const allProviders = new Set<string>()
    for (const row of data ?? []) {
        const providers = (row as { ott_providers: string[] | null }).ott_providers
        if (providers) {
            providers.forEach((p) => allProviders.add(p))
        }
    }

    return Array.from(allProviders).sort()
}

/**
 * Load all OTT providers for every mood (plus the unfiltered "_all" list) in parallel.
 * Results are persisted to localStorage so subsequent calls are instant.
 * Bump OTT_CACHE_KEY whenever the movie catalogue changes to invalidate stale data.
 */
export async function loadAllProviders(): Promise<ProviderCache> {
    if (typeof window !== "undefined") {
        try {
            const cached = localStorage.getItem(OTT_CACHE_KEY)
            if (cached) {
                return JSON.parse(cached) as ProviderCache
            }
        } catch {
            // corrupted storage — fall through to fetch
        }
    }

    const entries = await Promise.all([
        fetchProvidersDirect(undefined).then((p): [ProviderCacheKey, string[]] => ["_all", p]),
        ...ALL_MOODS.map((mood) =>
            fetchProvidersDirect(mood).then((p): [ProviderCacheKey, string[]] => [mood, p])
        ),
    ])

    const cache = Object.fromEntries(entries) as ProviderCache

    if (typeof window !== "undefined") {
        try {
            localStorage.setItem(OTT_CACHE_KEY, JSON.stringify(cache))
        } catch {
            // storage quota exceeded — cache just won't persist
        }
    }

    return cache
}

/**
 * Get distinct OTT providers for a given mood (or all providers when no mood is passed).
 * Reads from the localStorage cache populated by loadAllProviders(); falls back to a
 * direct fetch if the cache hasn't been warmed yet.
 */
export async function getAvailableProviders(mood?: Mood): Promise<string[]> {
    const cache = await loadAllProviders()
    return cache[mood ?? "_all"] ?? []
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
 * Round-robin interleave of multiple arrays.
 * [A, B, C], [D, E] → [A, D, B, E, C]
 * Ensures equal representation when pools have different sizes.
 */
export function interleaveArrays<T>(arrays: T[][]): T[] {
    const result: T[] = []
    const maxLen = Math.max(...arrays.map((a) => a.length))
    for (let i = 0; i < maxLen; i++) {
        for (const arr of arrays) {
            if (i < arr.length) result.push(arr[i])
        }
    }
    return result
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
