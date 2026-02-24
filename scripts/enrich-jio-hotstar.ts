/**
 * Additive backfill: tag existing movies with "Jio Hotstar" where confirmed.
 *
 * For every movie/TV show in Supabase, this script calls the TMDB watch/providers
 * API and checks whether the title is available as a flatrate (subscription)
 * stream on JioCinema (provider ID 220) or Disney+ Hotstar (provider ID 122)
 * in India (region=IN).
 *
 * If confirmed, "Jio Hotstar" is MERGED into the existing ott_providers array —
 * no existing provider data is removed.
 *
 * Requires:
 *   - TMDB_API_KEY
 *   - NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)
 *   - SUPABASE_SERVICE_ROLE_KEY
 *
 * Run: npx tsx scripts/enrich-jio-hotstar.ts
 */

import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
dotenv.config()
import { createClient } from "@supabase/supabase-js"

const TMDB_BASE = "https://api.themoviedb.org/3"
const WATCH_REGION = "IN"

// TMDB provider ID for Jio Hotstar in India (region=IN).
// TMDB lists this as provider 2336 "JioHotstar" — the unified platform post-merger.
const JIO_HOTSTAR_PROVIDER_IDS = new Set([
    2336, // JioHotstar (the current unified Jio Hotstar platform)
])
const JIO_HOTSTAR_LABEL = "Jio Hotstar"

// Moods we care about (excludes anuj_picks)
const TARGET_MOODS = new Set([
    "imdb_top", "light_and_fun", "bollywood", "oscar", "srk",
    "latest", "gritty_thrillers", "quick_watches", "reality_and_drama", "whats_viral",
])

interface TMDBProvider {
    provider_id: number
    provider_name: string
}

interface TMDBWatchResponse {
    id: number
    results: {
        [region: string]: {
            flatrate?: TMDBProvider[]
            rent?: TMDBProvider[]
            buy?: TMDBProvider[]
        }
    }
}

async function tmdbGet<T>(path: string): Promise<T> {
    const key = process.env.TMDB_API_KEY
    if (!key) throw new Error("Missing TMDB_API_KEY in environment")
    const url = new URL(`${TMDB_BASE}${path}`)
    url.searchParams.set("api_key", key)

    let retries = 5
    while (retries > 0) {
        const res = await fetch(url.toString())
        if (res.status === 429) {
            await sleep(1000)
            retries--
            continue
        }
        if (!res.ok) throw new Error(`TMDB ${path}: ${res.status}`)
        return res.json() as Promise<T>
    }
    throw new Error(`TMDB ${path}: exceeded retry limit`)
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Extract the TMDB numeric ID from a Supabase row ID.
 * Format: "{mood}_{tmdb_id}" → tmdb_id
 *
 * We extract the trailing number from every ID. Truly invalid TMDB IDs (e.g. the handful
 * of legacy sequential "fun_1" style rows) will simply return no providers from the TMDB
 * API, so isOnJioHotstar() safely returns false for them. We only hard-skip IDs where
 * the trailing portion isn't numeric at all.
 */
function extractTmdbId(rowId: string): { tmdbId: number; isTV: boolean } | null {
    const parts = rowId.split("_")
    const last = parts[parts.length - 1]
    const num = parseInt(last, 10)
    if (Number.isNaN(num)) return null

    // TV shows: reality_and_drama entries and anuj_picks_tv_* entries
    const isTV = rowId.startsWith("reality_and_drama") || rowId.includes("_tv_")
    return { tmdbId: num, isTV }
}

/**
 * Returns true if the title is available on JioCinema or Disney+ Hotstar
 * as a flatrate stream in India.
 */
async function isOnJioHotstar(tmdbId: number, isTV: boolean): Promise<boolean> {
    try {
        const endpoint = isTV
            ? `/tv/${tmdbId}/watch/providers`
            : `/movie/${tmdbId}/watch/providers`
        const data = await tmdbGet<TMDBWatchResponse>(endpoint)
        const flatrate = data.results?.[WATCH_REGION]?.flatrate ?? []
        return flatrate.some((p) => JIO_HOTSTAR_PROVIDER_IDS.has(p.provider_id))
    } catch {
        return false
    }
}

async function main() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("Need NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY")
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Paginate through all movies
    console.log("Fetching all movies from Supabase...")
    let allMovies: { id: string; title: string; mood: string; ott_providers: string[] }[] = []
    let page = 0
    while (true) {
        const { data: chunk, error } = await supabase
            .from("movies")
            .select("id, title, mood, ott_providers")
            .range(page * 1000, (page + 1) * 1000 - 1)
        if (error) throw new Error(`Supabase fetch failed: ${error.message}`)
        if (!chunk || chunk.length === 0) break
        allMovies.push(...chunk)
        if (chunk.length < 1000) break
        page++
    }

    // Filter to target moods only
    const movies = allMovies.filter((m) => TARGET_MOODS.has(m.mood))
    console.log(`Total in DB: ${allMovies.length} | Targeting ${movies.length} movies across 10 moods\n`)

    let tagged = 0
    let alreadyTagged = 0
    let notOnPlatform = 0
    let skipped = 0

    for (let i = 0; i < movies.length; i++) {
        const movie = movies[i]
        const extracted = extractTmdbId(movie.id)

        if (!extracted) {
            console.log(`  ⏭  [${i + 1}/${movies.length}] Skipping "${movie.title}" — no TMDB ID extractable from "${movie.id}"`)
            skipped++
            await sleep(0)
            continue
        }

        const existing: string[] = movie.ott_providers ?? []

        // Skip if already tagged
        if (existing.includes(JIO_HOTSTAR_LABEL)) {
            alreadyTagged++
            continue
        }

        const onJio = await isOnJioHotstar(extracted.tmdbId, extracted.isTV)

        if (onJio) {
            const merged = [...new Set([...existing, JIO_HOTSTAR_LABEL])]
            const { error: updateErr } = await supabase
                .from("movies")
                .update({ ott_providers: merged })
                .eq("id", movie.id)

            if (updateErr) {
                console.error(`  ❌ [${i + 1}/${movies.length}] Error updating "${movie.title}": ${updateErr.message}`)
            } else {
                console.log(`  ✅ [${i + 1}/${movies.length}] "${movie.title}" → ${JSON.stringify(merged)}`)
                tagged++
            }
        } else {
            notOnPlatform++
        }

        // TMDB allows ~40 requests/10s; 250ms gap keeps us safely under limit
        await sleep(250)
    }

    console.log("\n--- Summary ---")
    console.log(`Total checked:       ${movies.length}`)
    console.log(`Newly tagged:        ${tagged}`)
    console.log(`Already had label:   ${alreadyTagged}`)
    console.log(`Not on Jio Hotstar:  ${notOnPlatform}`)
    console.log(`Skipped (no TMDB):   ${skipped}`)
    console.log("Done.")
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
