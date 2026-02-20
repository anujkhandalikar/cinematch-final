/**
 * Backfill OTT streaming providers for all movies in Supabase.
 *
 * Uses the TMDB watch/providers API to fetch streaming platform data.
 *
 * Requires:
 *   - TMDB_API_KEY
 *   - NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)
 *   - SUPABASE_SERVICE_ROLE_KEY
 *
 * Run: npx tsx scripts/backfill-ott-providers.ts
 */

import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
dotenv.config()
import { createClient } from "@supabase/supabase-js"

const TMDB_BASE = "https://api.themoviedb.org/3"
const WATCH_REGION = "IN" // India

// Major Indian OTT platforms we care about (whitelist)
const PROVIDER_WHITELIST = new Set([
    "Netflix",
    "Amazon Prime Video",
    "Disney Plus",
    "Disney+ Hotstar",
    "Hotstar",
    "JioCinema",
    "Jio Cinema",
    "Zee5",
    "ZEE5",
    "SonyLIV",
    "Apple TV Plus",
    "Apple TV+",
    "MUBI",
    "Lionsgate Play",
])

// Normalize provider names for consistency
function normalizeProvider(name: string): string {
    const map: Record<string, string> = {
        "Disney Plus": "Disney+ Hotstar",
        "Disney+ Hotstar": "Disney+ Hotstar",
        Hotstar: "Disney+ Hotstar",
        "Apple TV Plus": "Apple TV+",
        "Apple TV+": "Apple TV+",
        "Jio Cinema": "JioCinema",
        JioCinema: "JioCinema",
        ZEE5: "Zee5",
        Zee5: "Zee5",
    }
    return map[name] ?? name
}

interface TMDBProvider {
    provider_id: number
    provider_name: string
    logo_path: string
    display_priority: number
}

interface TMDBWatchResponse {
    id: number
    results: {
        [region: string]: {
            link?: string
            flatrate?: TMDBProvider[]
            rent?: TMDBProvider[]
            buy?: TMDBProvider[]
        }
    }
}

async function tmdbGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const key = process.env.TMDB_API_KEY
    if (!key) throw new Error("Missing TMDB_API_KEY in environment")
    const url = new URL(`${TMDB_BASE}${path}`)
    url.searchParams.set("api_key", key)
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
    const res = await fetch(url.toString())
    if (!res.ok) throw new Error(`TMDB ${path}: ${res.status} ${await res.text()}`)
    return res.json() as Promise<T>
}

/**
 * Extract the TMDB numeric ID from our movie ID format.
 * Examples: "imdb_top_278" → 278, "bolly_3" → null (old format without TMDB ID)
 */
function extractTmdbId(movieId: string): number | null {
    // New format from seed script: "{mood}_{tmdb_id}" e.g. "imdb_top_278", "light_and_fun_550"
    // Old format from migrations: "imdb_1", "fun_3", "bolly_5", "oscar_1", "srk_1"
    const parts = movieId.split("_")
    const lastPart = parts[parts.length - 1]
    const num = parseInt(lastPart, 10)

    if (Number.isNaN(num)) return null

    // Old format IDs (imdb_1, fun_3, etc.) have small sequential numbers
    // New TMDB IDs are typically larger. We'll try all of them and let TMDB tell us if invalid.
    return num
}

async function fetchWatchProviders(tmdbId: number): Promise<string[]> {
    try {
        const data = await tmdbGet<TMDBWatchResponse>(`/movie/${tmdbId}/watch/providers`)
        const regionData = data.results?.[WATCH_REGION]
        if (!regionData?.flatrate) return []

        const providers = regionData.flatrate
            .map((p) => p.provider_name)
            .filter((name) => PROVIDER_WHITELIST.has(name))
            .map(normalizeProvider)

        // Deduplicate after normalization
        return [...new Set(providers)]
    } catch (err) {
        // Movie may not exist on TMDB or no provider data
        return []
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("Need NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY")
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Fetch all movies
    console.log("Fetching all movies from Supabase...")
    const { data: movies, error } = await supabase
        .from("movies")
        .select("id, title")
        .order("id")

    if (error) throw new Error(`Failed to fetch movies: ${error.message}`)
    if (!movies || movies.length === 0) {
        console.log("No movies found.")
        return
    }

    console.log(`Found ${movies.length} movies. Fetching OTT providers from TMDB...\n`)

    let updated = 0
    let skipped = 0
    let noProviders = 0

    for (const movie of movies) {
        const tmdbId = extractTmdbId(movie.id)

        if (tmdbId === null) {
            console.log(`  ⏭  Skipping "${movie.title}" (id: ${movie.id}) — cannot extract TMDB ID`)
            skipped++
            continue
        }

        const providers = await fetchWatchProviders(tmdbId)

        if (providers.length > 0) {
            const { error: updateError } = await supabase
                .from("movies")
                .update({ ott_providers: providers })
                .eq("id", movie.id)

            if (updateError) {
                console.error(`  ❌ Error updating "${movie.title}":`, updateError.message)
            } else {
                console.log(`  ✅ "${movie.title}" → [${providers.join(", ")}]`)
                updated++
            }
        } else {
            console.log(`  ⚪ "${movie.title}" — no OTT providers found for region ${WATCH_REGION}`)
            noProviders++
        }

        // Rate limit: TMDB allows ~40 requests per 10 seconds
        await sleep(300)
    }

    console.log(`\n--- Summary ---`)
    console.log(`Total movies: ${movies.length}`)
    console.log(`Updated with OTT: ${updated}`)
    console.log(`No providers found: ${noProviders}`)
    console.log(`Skipped: ${skipped}`)
    console.log("Done.")
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
