/**
 * Seed Supabase with Anuj's curated picks (movies + TV shows).
 *
 * Requires:
 *   - TMDB_API_KEY
 *   - NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)
 *   - SUPABASE_SERVICE_ROLE_KEY
 *
 * Run: npx tsx scripts/seed-anuj-picks.ts
 * Or:  npm run seed:anuj-picks
 */

import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
dotenv.config()
import { createClient } from "@supabase/supabase-js"

const TMDB_BASE = "https://api.themoviedb.org/3"
const POSTER_BASE = "https://image.tmdb.org/t/p/w500"
const WATCH_REGION = "IN"
const MOOD = "anuj_picks"

const PROVIDER_WHITELIST = new Set([
  "Netflix",
  "Amazon Prime Video",
  "Zee5",
  "ZEE5",
  "MUBI",
  "Lionsgate Play",
])

function normalizeProvider(name: string): string {
  const map: Record<string, string> = { ZEE5: "Zee5" }
  return map[name] ?? name
}

// ─── Curated list ────────────────────────────────────────────────────────────
const ANUJ_PICKS: Array<{ title: string; year: number; type: "movie" | "tv" }> = [
  { title: "Before Sunrise", year: 1995, type: "movie" },
  { title: "Before Sunset", year: 2004, type: "movie" },
  { title: "Before Midnight", year: 2013, type: "movie" },
  { title: "Inception", year: 2010, type: "movie" },
  { title: "Interstellar", year: 2014, type: "movie" },
  { title: "Shutter Island", year: 2010, type: "movie" },
  { title: "Tamasha", year: 2015, type: "movie" },
  { title: "Tenet", year: 2020, type: "movie" },
  { title: "Whiplash", year: 2014, type: "movie" },
  { title: "Sherlock", year: 2010, type: "tv" },
  { title: "Rockstar", year: 2011, type: "movie" },
  { title: "Jolly LLB", year: 2013, type: "movie" },
  { title: "Hera Pheri", year: 2000, type: "movie" },
  { title: "Phir Hera Pheri", year: 2006, type: "movie" },
  { title: "Happy Patel: Khatarnak Jasoos", year: 2026, type: "movie" },
  { title: "Ted Lasso", year: 2020, type: "tv" },
  { title: "Vir Das: Landing", year: 2023, type: "movie" },
  { title: "Vir Das: Abroad Understanding", year: 2017, type: "movie" },
  { title: "Lion", year: 2016, type: "movie" },
  { title: "Honey Bunny", year: 2024, type: "tv" },
  { title: "The Family Man", year: 2019, type: "tv" },
  // "The Family Man Season 2" is the same TMDB entry — deduped automatically
  { title: "Modern Love", year: 2019, type: "tv" },
  { title: "Modern Love Mumbai", year: 2022, type: "tv" },
  { title: "This Is Us", year: 2016, type: "tv" },
  { title: "The Secret Life of Walter Mitty", year: 2013, type: "movie" },
  { title: "Inside Bill's Brain: Decoding Bill Gates", year: 2019, type: "tv" },
  { title: "Thappad", year: 2020, type: "movie" },
  { title: "Ship of Theseus", year: 2012, type: "movie" },
  { title: "Tumbbad", year: 2018, type: "movie" },
  { title: "Dark", year: 2017, type: "tv" },
  { title: "An Insignificant Man", year: 2016, type: "movie" },
  { title: "Ludo", year: 2020, type: "movie" },
  { title: "Drive", year: 2011, type: "movie" },
  { title: "Neerja", year: 2016, type: "movie" },
  { title: "House of Secrets: The Burari Deaths", year: 2021, type: "tv" },
  { title: "Rocket Boys", year: 2022, type: "tv" },
  { title: "An Action Hero", year: 2022, type: "movie" },
]

// ─── TMDB helpers ─────────────────────────────────────────────────────────────
async function tmdbGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const key = process.env.TMDB_API_KEY
  if (!key) throw new Error("Missing TMDB_API_KEY in environment")
  const url = new URL(`${TMDB_BASE}/${path.replace(/^\//, "")}`)
  url.searchParams.set("api_key", key)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`TMDB ${path}: ${res.status} ${await res.text()}`)
  return res.json() as Promise<T>
}

async function getGenreMaps() {
  const [movieGenres, tvGenres] = await Promise.all([
    tmdbGet<{ genres: { id: number; name: string }[] }>("/genre/movie/list"),
    tmdbGet<{ genres: { id: number; name: string }[] }>("/genre/tv/list"),
  ])
  return {
    movie: new Map(movieGenres.genres.map((g) => [g.id, g.name])),
    tv: new Map(tvGenres.genres.map((g) => [g.id, g.name])),
  }
}

interface TMDBResult {
  id: number
  title?: string       // movies
  name?: string        // TV
  poster_path: string | null
  genre_ids?: number[]
  release_date?: string      // movies
  first_air_date?: string    // TV
  overview: string
  vote_average: number
}

async function searchTMDB(
  title: string,
  year: number,
  type: "movie" | "tv"
): Promise<TMDBResult | null> {
  const endpoint = type === "movie" ? "/search/movie" : "/search/tv"
  const yearParam = type === "movie" ? "year" : "first_air_date_year"

  // Try with year first for precision
  const withYear = await tmdbGet<{ results: TMDBResult[] }>(endpoint, {
    query: title,
    [yearParam]: String(year),
  })
  if (withYear.results.length > 0) return withYear.results[0]

  // Fall back to title-only
  const withoutYear = await tmdbGet<{ results: TMDBResult[] }>(endpoint, { query: title })
  return withoutYear.results[0] ?? null
}

async function getOttProviders(tmdbId: number, type: "movie" | "tv"): Promise<string[]> {
  const path = type === "movie"
    ? `/movie/${tmdbId}/watch/providers`
    : `/tv/${tmdbId}/watch/providers`
  try {
    const data = await tmdbGet<{
      results: { [region: string]: { flatrate?: { provider_name: string }[] } }
    }>(path)
    const regionData = data.results?.[WATCH_REGION]
    if (!regionData?.flatrate) return []
    return [
      ...new Set(
        regionData.flatrate
          .map((p) => p.provider_name)
          .filter((name) => PROVIDER_WHITELIST.has(name))
          .map(normalizeProvider)
      ),
    ]
  } catch {
    return []
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  console.log("Fetching TMDB genre maps...")
  const genreMaps = await getGenreMaps()

  const rows: Array<{
    id: string
    title: string
    poster_url: string
    genre: string[]
    year: number
    overview: string
    imdb_rating: number
    mood: string
    ott_providers: string[]
  }> = []

  const seenIds = new Set<string>()

  for (const pick of ANUJ_PICKS) {
    console.log(`\nSearching: "${pick.title}" (${pick.year}, ${pick.type})...`)
    await new Promise((r) => setTimeout(r, 300)) // TMDB rate limit

    let result: TMDBResult | null = null
    try {
      result = await searchTMDB(pick.title, pick.year, pick.type)
    } catch (err) {
      console.warn(`  ⚠️  Search failed: ${err}`)
      continue
    }

    if (!result) {
      console.warn(`  ⚠️  Not found on TMDB: ${pick.title}`)
      continue
    }

    // IDs: anuj_picks_m_<tmdbId> for movies, anuj_picks_tv_<tmdbId> for TV
    const idPrefix = pick.type === "tv" ? "anuj_picks_tv" : "anuj_picks_m"
    const id = `${idPrefix}_${result.id}`

    if (seenIds.has(id)) {
      console.log(`  ⏭  Duplicate (same TMDB entry): ${pick.title}`)
      continue
    }
    seenIds.add(id)

    const poster_url = result.poster_path ? `${POSTER_BASE}${result.poster_path}` : ""
    if (!poster_url) {
      console.warn(`  ⚠️  No poster for: ${pick.title}`)
      continue
    }

    const title = (result.title ?? result.name ?? pick.title).trim()
    const genreMap = pick.type === "movie" ? genreMaps.movie : genreMaps.tv
    const genre = (result.genre_ids ?? [])
      .map((gid) => genreMap.get(gid))
      .filter(Boolean) as string[]

    const dateStr = pick.type === "movie" ? result.release_date : result.first_air_date
    const year = dateStr ? parseInt(dateStr.slice(0, 4), 10) : pick.year

    await new Promise((r) => setTimeout(r, 300))
    const ott_providers = await getOttProviders(result.id, pick.type)

    rows.push({
      id,
      title,
      poster_url,
      genre: genre.length ? genre : ["Drama"],
      year,
      overview: result.overview?.trim() || "No overview.",
      imdb_rating: Math.round(result.vote_average * 10) / 10,
      mood: MOOD,
      ott_providers,
    })

    console.log(
      `  ✅ ${title} (${year}) | genres: ${genre.join(", ")} | OTT: ${ott_providers.join(", ") || "none"}`
    )
  }

  if (rows.length === 0) {
    console.log("\nNo rows to insert.")
    return
  }

  console.log(`\nUpserting ${rows.length} entries into Supabase...`)
  const { error } = await supabase.from("movies").upsert(rows, { onConflict: "id" })
  if (error) {
    console.error("Supabase upsert error:", error)
    process.exit(1)
  }
  console.log("Done. ✅")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
