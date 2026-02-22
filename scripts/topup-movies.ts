import * as dotenv from "dotenv"
import { createClient } from "@supabase/supabase-js"

dotenv.config({ path: ".env" })

const TMDB_BASE = "https://api.themoviedb.org/3"
const POSTER_BASE = "https://image.tmdb.org/t/p/w500"
const WATCH_REGION = "IN"

// Providers we want to guarantee at least 20 movies for each mood
const TARGET_PROVIDERS = [
    { name: "Netflix", id: 8 },
    { name: "Amazon Prime Video", id: 119 },
    { name: "Zee5", id: 232 },
    { name: "SonyLIV", id: 237 },
    { name: "Disney+", id: 122 },
    { name: "Lionsgate Play", id: 561 },
    { name: "MUBI", id: 11 }
]

const PROVIDER_NAME_MAP: Record<number, string> = {
    8: "Netflix",
    119: "Amazon Prime Video",
    232: "Zee5",
    237: "SonyLIV",
    122: "Disney+",
    561: "Lionsgate Play",
    11: "MUBI"
}

type Mood = "imdb_top" | "light_and_fun" | "bollywood" | "oscar" | "srk" | "latest" | "gritty_thrillers" | "quick_watches" | "reality_and_drama" | "whats_viral"

interface TMDBMovie {
    id: number
    title?: string
    name?: string
    poster_path: string | null
    genre_ids?: number[]
    release_date?: string
    first_air_date?: string
    overview: string
    vote_average: number
}

interface SupabaseMovieRow {
    id: string
    title: string
    poster_url: string
    genre: string[]
    year: number
    overview: string
    imdb_rating: number
    mood: Mood
    ott_providers: string[]
}

// Helper: Make a TMDB request
async function tmdbGet<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
    const key = process.env.TMDB_API_KEY
    if (!key) throw new Error("Missing TMDB_API_KEY in .env")
    const url = new URL(path.replace(/^\//, ""), TMDB_BASE + "/")
    url.searchParams.set("api_key", key)
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))

    let res: Response | null = null;
    let retries = 5;

    while (retries > 0) {
        try {
            res = await fetch(url.toString())
            if (res.status === 429) {
                await new Promise(r => setTimeout(r, 1000))
                retries--
                continue
            }
            break
        } catch (e: any) {
            // Catch network errors like ECONNRESET
            console.log(`[Network Error] Retrying TMDB request... (${retries} retries left)`)
            await new Promise(r => setTimeout(r, 1000))
            retries--
            if (retries === 0) throw e
        }
    }

    if (!res || !res.ok) {
        throw new Error(`TMDB ${path}: ${res?.status} ${await res?.text()}`)
    }
    return res.json() as Promise<T>
}

// Pre-fetch genres so we can map IDs to names
async function getGenreMap(): Promise<Map<number, string>> {
    const mData = await tmdbGet<{ genres: { id: number; name: string }[] }>("/genre/movie/list")
    const tvData = await tmdbGet<{ genres: { id: number; name: string }[] }>("/genre/tv/list")
    const map = new Map<number, string>()
    mData.genres.forEach(g => map.set(g.id, g.name))
    tvData.genres.forEach(g => map.set(g.id, g.name))
    return map
}

function mapToSupabase(m: TMDBMovie, mood: Mood, genreMap: Map<number, string>, hardcodedProvider?: string): SupabaseMovieRow | null {
    const rawDate = m.release_date || m.first_air_date
    const year = rawDate ? parseInt(rawDate.slice(0, 4), 10) : 0
    if (!year || Number.isNaN(year)) return null

    const genre = (m.genre_ids || []).map((id) => genreMap.get(id)).filter(Boolean) as string[]
    const poster_url = m.poster_path ? `${POSTER_BASE}${m.poster_path}` : ""
    if (!poster_url) return null

    return {
        id: `${mood}_${m.id}`,
        title: m.title || m.name || "Unknown Title",
        poster_url,
        genre: genre.length ? genre : ["Drama"], // Fallback
        year,
        overview: m.overview?.trim() || "No overview available.",
        imdb_rating: Math.round(m.vote_average * 10) / 10,
        mood,
        ott_providers: hardcodedProvider ? [hardcodedProvider] : []
    }
}

function getTMDBQuery(mood: Mood): { endpoint: string, params: Record<string, string | number> } {
    const defaultParams: Record<string, string | number> = {
        sort_by: "vote_average.desc",
        "vote_count.gte": 100 // ensure some baseline quality
    }

    switch (mood) {
        case "imdb_top":
            return { endpoint: "/discover/movie", params: { ...defaultParams, watch_region: WATCH_REGION, "vote_count.gte": 1000 } }
        case "light_and_fun":
            return { endpoint: "/discover/movie", params: { ...defaultParams, watch_region: WATCH_REGION, with_genres: "35|10751" } }
        case "bollywood":
            return { endpoint: "/discover/movie", params: { ...defaultParams, watch_region: WATCH_REGION, with_original_language: "hi" } }
        case "oscar":
            return { endpoint: "/discover/movie", params: { ...defaultParams, watch_region: WATCH_REGION, "vote_count.gte": 5000 } }
        case "srk":
            return { endpoint: "/discover/movie", params: { ...defaultParams, watch_region: WATCH_REGION, with_cast: "35742" } }
        case "latest":
            return { endpoint: "/discover/movie", params: { ...defaultParams, watch_region: WATCH_REGION, "primary_release_date.gte": "2024-01-01" } }
        case "gritty_thrillers":
            return { endpoint: "/discover/movie", params: { ...defaultParams, watch_region: WATCH_REGION, with_genres: "80,53" } }
        case "quick_watches":
            // Global search for anything under 100 mins
            return { endpoint: "/discover/movie", params: { ...defaultParams, "vote_count.gte": 10, "with_runtime.lte": 100 } }
        case "reality_and_drama":
            // Global search for Reality TV Data
            return { endpoint: "/discover/tv", params: { ...defaultParams, "vote_count.gte": 10, with_genres: "10764", sort_by: "popularity.desc" } }
        case "whats_viral":
            // Global trending across all movies
            return { endpoint: "/trending/all/week", params: { "vote_count.gte": 10 } }
    }
}

async function main() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase config")

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const genreMap = await getGenreMap()

    // 1. Audit current state (paginated)
    let existingMovies: any[] = []
    let page = 0
    while (true) {
        const { data: chunk, error } = await supabase
            .from("movies")
            .select("id, mood, ott_providers")
            .range(page * 1000, (page + 1) * 1000 - 1)

        if (error) throw new Error("Failed to read movies")
        if (!chunk || chunk.length === 0) break
        existingMovies.push(...chunk)
        if (chunk.length < 1000) break
        page++
    }
    const tracking: Record<Mood, Record<string, number>> = {} as any
    const moodTotals: Record<Mood, number> = {} as any
    const existingIds = new Set(existingMovies.map(m => m.id))

    const moodsList: Mood[] = ["imdb_top", "light_and_fun", "bollywood", "oscar", "srk", "latest", "gritty_thrillers", "quick_watches", "reality_and_drama", "whats_viral"]

    moodsList.forEach(m => {
        tracking[m] = {}
        moodTotals[m] = 0
        TARGET_PROVIDERS.forEach(p => tracking[m][p.name] = 0)
    })

    existingMovies.forEach(m => {
        if (!tracking[m.mood as Mood]) return
        moodTotals[m.mood as Mood]++

        const providers = m.ott_providers || []
        providers.forEach((p: string) => {
            if (tracking[m.mood as Mood][p] !== undefined) tracking[m.mood as Mood][p]++
        })
    })

    const newMoviesToInsert: SupabaseMovieRow[] = []

    // 2. Iterate and fill gaps
    console.log("Starting Top-Up Routine...")

    for (const mood of moodsList) {
        console.log(`\nAnalyzing Mood: ${mood} (Current Total: ${moodTotals[mood]})`)

        // A. Attempt to hit >= 20 per OTT Provider
        for (const provider of TARGET_PROVIDERS) {
            let currentCount = tracking[mood][provider.name]
            const target = 20

            if (currentCount >= target) {
                console.log(`  [OK] ${provider.name} has ${currentCount} movies.`)
                continue
            }

            console.log(`  [FILLING] ${provider.name} has ${currentCount}/${target} movies... fetching TMDB.`)

            const queryConf = getTMDBQuery(mood)
            queryConf.params.with_watch_providers = provider.id

            let page = 1
            while (currentCount < target && page <= 5) { // Protect from infinite loops
                queryConf.params.page = page
                const tmdbRes = await tmdbGet<{ results: TMDBMovie[] }>(queryConf.endpoint, queryConf.params)

                if (!tmdbRes.results || tmdbRes.results.length === 0) break

                for (const tmdb of tmdbRes.results) {
                    if (currentCount >= target) break

                    const rowId = `${mood}_${tmdb.id}`
                    // Skip if already in database OR already queued
                    if (existingIds.has(rowId) || newMoviesToInsert.some(m => m.id === rowId)) {
                        continue
                    }

                    const mapped = mapToSupabase(tmdb, mood, genreMap, provider ? provider.name : undefined)
                    if (mapped) {
                        const existingIdx = newMoviesToInsert.findIndex(m => m.id === rowId)
                        if (existingIdx >= 0) {
                            // Merge providers if it's already queued
                            if (provider) {
                                newMoviesToInsert[existingIdx].ott_providers = [...new Set([...newMoviesToInsert[existingIdx].ott_providers, provider.name])]
                            }
                        } else if (existingIds.has(rowId)) {
                            // If it's in DB already, just register it locally so we don't count it as a "new" add
                            if (provider) {
                                const existingMovie = existingMovies.find(m => m.id === rowId)
                                if (existingMovie && !existingMovie.ott_providers?.includes(provider.name)) {
                                    mapped.ott_providers = [...new Set([...(existingMovie.ott_providers || []), provider.name])]
                                    newMoviesToInsert.push(mapped) // Re-upsert to add provider
                                }
                            }
                        } else {
                            if (!provider) {
                                // Broad fetch fallback: attempt to get providers
                                try {
                                    const watchData = await tmdbGet<{ results: { [region: string]: { flatrate?: { provider_name: string }[] } } }>(`/movie/${tmdb.id}/watch/providers`)
                                    const regionData = watchData.results?.[WATCH_REGION]
                                    if (regionData?.flatrate) {
                                        mapped.ott_providers = regionData.flatrate.map(p => p.provider_name)
                                    }
                                } catch (e) { }
                            }
                            newMoviesToInsert.push(mapped)
                            currentCount++
                            moodTotals[mood]++
                        }
                    }
                }
                page++
                await new Promise(r => setTimeout(r, 200)) // Rate limiting 
            }
            if (provider) {
                console.log(`    -> Reached ${currentCount} (added ${currentCount - tracking[mood][provider.name]}).`)
                tracking[mood][provider.name] = currentCount
            }
        }

        // B. Fallback rule: If total for mood is STILL < 100, do a broad fetch
        if (moodTotals[mood] < 100) {
            console.log(`  [FALLBACK] Total for ${mood} is ${moodTotals[mood]}/100. Pinging broad query to hit exactly 100.`)
            const queryConf = getTMDBQuery(mood)
            let page = 1
            let prevTotals = moodTotals[mood]

            while (moodTotals[mood] < 100 && page <= 50) {
                queryConf.params.page = page
                const tmdbRes = await tmdbGet<{ results: TMDBMovie[] }>(queryConf.endpoint, queryConf.params)
                if (!tmdbRes.results || tmdbRes.results.length === 0) break

                for (const tmdb of tmdbRes.results) {
                    if (moodTotals[mood] >= 100) break

                    const rowId = `${mood}_${tmdb.id}`
                    if (existingIds.has(rowId) || newMoviesToInsert.some(m => m.id === rowId)) {
                        continue
                    }

                    const mapped = mapToSupabase(tmdb, mood, genreMap)
                    if (mapped) {
                        try {
                            // Attempt to get regions globally if needed, fallback to whatever we fetch
                            const watchData = await tmdbGet<{ results: { [region: string]: { flatrate?: { provider_name: string }[] } } }>(
                                mood === 'reality_and_drama' ? `/tv/${tmdb.id}/watch/providers` : `/movie/${tmdb.id}/watch/providers`
                            )
                            const regionData = watchData.results?.[WATCH_REGION]
                            if (regionData?.flatrate) {
                                mapped.ott_providers = regionData.flatrate.map(p => p.provider_name)
                            }
                        } catch (e) { }

                        newMoviesToInsert.push(mapped)
                        moodTotals[mood]++
                    }
                }
                page++
            }
            console.log(`    -> Mood Total reached ${moodTotals[mood]}`)
        }

    }

    // 3. Upsert into database
    console.log(`\nReady to upsert ${newMoviesToInsert.length} new movies across all moods.`)

    // Batch upsert chunks of 100
    const chunkSize = 100
    let inserted = 0
    for (let i = 0; i < newMoviesToInsert.length; i += chunkSize) {
        const chunk = newMoviesToInsert.slice(i, i + chunkSize)
        const { error } = await supabase.from("movies").upsert(chunk, { onConflict: "id" })
        if (error) {
            console.error("Upsert chunk failed:", error)
        } else {
            inserted += chunk.length
            console.log(`Inserted chunk... (${inserted}/${newMoviesToInsert.length})`)
        }
    }

    console.log(`\nFinished! Successfully added ${inserted} new movies.`)
}

main().catch(err => {
    console.error(err)
    process.exit(1)
})
