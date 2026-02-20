/**
 * Seed Supabase movies table from TMDB API.
 *
 * Requires:
 *   - TMDB_API_KEY (get from https://www.themoviedb.org/settings/api)
 *   - NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)
 *   - SUPABASE_SERVICE_ROLE_KEY (bypasses RLS so we can insert; from Supabase dashboard)
 *
 * Run: npx tsx scripts/seed-movies-from-tmdb.ts
 * Or:  npm run seed:movies
 */

import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
dotenv.config()
import { createClient } from "@supabase/supabase-js"

const TMDB_BASE = "https://api.themoviedb.org/3"
const POSTER_BASE = "https://image.tmdb.org/t/p/w500"
const WATCH_REGION = "IN"

// Major Indian OTT platforms whitelist
const PROVIDER_WHITELIST = new Set([
  "Netflix", "Amazon Prime Video",
  "Zee5", "ZEE5",
  "MUBI", "Lionsgate Play",
])

function normalizeProvider(name: string): string {
  const map: Record<string, string> = {
    ZEE5: "Zee5", Zee5: "Zee5",
  }
  return map[name] ?? name
}

type Mood = "imdb_top" | "light_and_fun" | "bollywood" | "oscar" | "srk"

interface TMDBMovie {
  id: number
  title: string
  poster_path: string | null
  genre_ids?: number[]
  release_date?: string
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

async function tmdbGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const key = process.env.TMDB_API_KEY
  if (!key) throw new Error("Missing TMDB_API_KEY in environment")
  const base = TMDB_BASE.endsWith("/") ? TMDB_BASE : `${TMDB_BASE}/`
  const url = new URL(path.replace(/^\//, ""), base)
  url.searchParams.set("api_key", key)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`TMDB ${path}: ${res.status} ${await res.text()}`)
  return res.json() as Promise<T>
}

async function getGenreMap(): Promise<Map<number, string>> {
  const data = await tmdbGet<{ genres: { id: number; name: string }[] }>("/genre/movie/list")
  return new Map(data.genres.map((g) => [g.id, g.name]))
}

function mapMovie(m: TMDBMovie, mood: Mood, genreMap: Map<number, string>): SupabaseMovieRow | null {
  const year = m.release_date ? parseInt(m.release_date.slice(0, 4), 10) : 0
  if (!year || Number.isNaN(year)) return null
  const genre = (m.genre_ids ?? []).map((id) => genreMap.get(id)).filter(Boolean) as string[]
  const poster_url = m.poster_path ? `${POSTER_BASE}${m.poster_path}` : ""
  if (!poster_url) return null
  return {
    id: `${mood}_${m.id}`,
    title: m.title,
    poster_url,
    genre: genre.length ? genre : ["Drama"],
    year,
    overview: m.overview?.trim() || "No overview.",
    imdb_rating: Math.round(m.vote_average * 10) / 10,
    mood,
    ott_providers: [], // Will be enriched later
  }
}

async function fetchTopRated(genreMap: Map<number, string>, pageLimit: number): Promise<SupabaseMovieRow[]> {
  const out: SupabaseMovieRow[] = []
  for (let page = 1; page <= pageLimit; page++) {
    const data = await tmdbGet<{ results: TMDBMovie[] }>("/movie/top_rated", { page: String(page) })
    for (const m of data.results) {
      const row = mapMovie(m, "imdb_top", genreMap)
      if (row) out.push(row)
    }
  }
  return out
}

async function fetchLightAndFun(genreMap: Map<number, string>, pageLimit: number): Promise<SupabaseMovieRow[]> {
  const out: SupabaseMovieRow[] = []
  for (let page = 1; page <= pageLimit; page++) {
    const data = await tmdbGet<{ results: TMDBMovie[] }>("/discover/movie", {
      with_genres: "35,10751",
      sort_by: "vote_count.desc",
      page: String(page),
    })
    for (const m of data.results) {
      const row = mapMovie(m, "light_and_fun", genreMap)
      if (row) out.push(row)
    }
  }
  return out
}

async function fetchBollywood(genreMap: Map<number, string>, pageLimit: number): Promise<SupabaseMovieRow[]> {
  const out: SupabaseMovieRow[] = []
  for (let page = 1; page <= pageLimit; page++) {
    const data = await tmdbGet<{ results: TMDBMovie[] }>("/discover/movie", {
      region: "IN",
      with_original_language: "hi",
      sort_by: "vote_count.desc",
      page: String(page),
    })
    for (const m of data.results) {
      const row = mapMovie(m, "bollywood", genreMap)
      if (row) out.push(row)
    }
  }
  return out
}

async function fetchOscarWinners(genreMap: Map<number, string>): Promise<SupabaseMovieRow[]> {
  // TMDB list 28: "Best Picture Winners - The Academy Awards" (paginated, 20 per page)
  type ListItem = { id: number; title: string; poster_path: string | null; genre_ids?: number[]; release_date?: string; overview?: string; vote_average?: number }
  type ListResponse = { items: ListItem[]; total_pages: number }

  const firstPage = await tmdbGet<ListResponse>("/list/28", { page: "1" })
  const allItems: ListItem[] = [...firstPage.items]

  for (let page = 2; page <= firstPage.total_pages; page++) {
    const pageData = await tmdbGet<ListResponse>("/list/28", { page: String(page) })
    allItems.push(...pageData.items)
  }

  const out: SupabaseMovieRow[] = []
  for (const m of allItems) {
    const row = mapMovie(
      {
        id: m.id,
        title: m.title,
        poster_path: m.poster_path,
        genre_ids: m.genre_ids,
        release_date: m.release_date,
        overview: m.overview ?? "",
        vote_average: m.vote_average ?? 0,
      },
      "oscar",
      genreMap
    )
    if (row) out.push(row)
  }
  return out
}

async function fetchSRK(genreMap: Map<number, string>): Promise<SupabaseMovieRow[]> {
  // Shah Rukh Khan person_id on TMDB (https://www.themoviedb.org/person/35742-shah-rukh-khan)
  const data = await tmdbGet<{ cast: Array<{ id: number; title: string; poster_path: string | null; genre_ids?: number[]; release_date?: string; overview?: string; vote_average?: number }> }>(
    "/person/35742/movie_credits"
  )
  const out: SupabaseMovieRow[] = []
  for (const m of data.cast) {
    const row = mapMovie(
      {
        id: m.id,
        title: m.title,
        poster_path: m.poster_path,
        genre_ids: m.genre_ids,
        release_date: m.release_date,
        overview: m.overview ?? "",
        vote_average: m.vote_average ?? 0,
      },
      "srk",
      genreMap
    )
    if (row) out.push(row)
  }
  return out
}

function parseArgs(): { targetMood?: Mood; clean: boolean } {
  const args = process.argv.slice(2)
  let targetMood: Mood | undefined
  let clean = false

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--mood" && args[i + 1]) {
      const validMoods: Mood[] = ["imdb_top", "light_and_fun", "bollywood", "oscar", "srk"]
      const val = args[i + 1] as Mood
      if (!validMoods.includes(val)) {
        throw new Error(`Invalid mood "${val}". Valid: ${validMoods.join(", ")}`)
      }
      targetMood = val
      i++
    } else if (args[i] === "--clean") {
      clean = true
    }
  }

  if (clean && !targetMood) {
    throw new Error("--clean requires --mood <name> to avoid accidentally deleting all data")
  }

  return { targetMood, clean }
}

async function main() {
  const { targetMood, clean } = parseArgs()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Need NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY")
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  console.log("Fetching TMDB genre list...")
  const genreMap = await getGenreMap()

  let moodConfig: { mood: Mood; label: string; fetch: () => Promise<SupabaseMovieRow[]> }[] = [
    { mood: "imdb_top", label: "IMDb top rated", fetch: () => fetchTopRated(genreMap, 5) },
    { mood: "light_and_fun", label: "Light & fun (comedy)", fetch: () => fetchLightAndFun(genreMap, 5) },
    { mood: "bollywood", label: "Bollywood", fetch: () => fetchBollywood(genreMap, 5) },
    { mood: "oscar", label: "Oscar winners", fetch: () => fetchOscarWinners(genreMap) },
    { mood: "srk", label: "Shah Rukh Khan", fetch: () => fetchSRK(genreMap) },
  ]

  if (targetMood) {
    moodConfig = moodConfig.filter((c) => c.mood === targetMood)
    console.log(`Targeting mood: ${targetMood}`)
  }

  if (clean && targetMood) {
    console.log(`Deleting existing ${targetMood} movies...`)
    const { error } = await supabase.from("movies").delete().eq("mood", targetMood)
    if (error) {
      console.error("Delete error:", error)
      process.exit(1)
    }
    console.log(`  Deleted.`)
  }

  const allRows: SupabaseMovieRow[] = []
  for (const { label, fetch } of moodConfig) {
    console.log(`Fetching ${label}...`)
    const rows = await fetch()
    console.log(`  ${rows.length} movies`)
    allRows.push(...rows)
  }

  if (allRows.length === 0) {
    console.log("No movies to upsert.")
    return
  }

  // Enrich with OTT providers
  console.log(`\nFetching OTT providers for ${allRows.length} movies...`)
  let enriched = 0
  for (const row of allRows) {
    const tmdbIdMatch = row.id.match(/_([\d]+)$/)
    if (!tmdbIdMatch) continue
    const tmdbId = parseInt(tmdbIdMatch[1], 10)
    if (Number.isNaN(tmdbId)) continue

    try {
      const watchData = await tmdbGet<{ results: { [region: string]: { flatrate?: { provider_name: string }[] } } }>(
        `/movie/${tmdbId}/watch/providers`
      )
      const regionData = watchData.results?.[WATCH_REGION]
      if (regionData?.flatrate) {
        const providers = regionData.flatrate
          .map((p) => p.provider_name)
          .filter((name) => PROVIDER_WHITELIST.has(name))
          .map(normalizeProvider)
        row.ott_providers = [...new Set(providers)]
        if (row.ott_providers.length > 0) enriched++
      }
    } catch {
      // Skip if API call fails
    }
    // Rate limit
    await new Promise((r) => setTimeout(r, 300))
  }
  console.log(`  Enriched ${enriched} movies with OTT data.`)

  const deduped = [...new Map(allRows.map((r) => [r.id, r])).values()]
  console.log(`Upserting ${deduped.length} movies into Supabase (${allRows.length - deduped.length} duplicates removed)...`)
  const { error } = await supabase.from("movies").upsert(deduped, { onConflict: "id" })
  if (error) {
    console.error("Supabase upsert error:", error)
    process.exit(1)
  }
  console.log("Done.")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
