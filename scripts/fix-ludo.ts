import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
dotenv.config()
import { createClient } from "@supabase/supabase-js"

const TMDB_CORRECT_ID = 658412 // Ludo (2020, Hindi, dir. Anurag Basu)
const TMDB_WRONG_ID   = 718697 // Ludo (2019, English, wrong entry)
const POSTER_BASE = "https://image.tmdb.org/t/p/w500"
const WATCH_REGION = "IN"
const WHITELIST = new Set(["Netflix", "Amazon Prime Video", "Zee5", "ZEE5", "MUBI", "Lionsgate Play"])

async function main() {
  const key = process.env.TMDB_API_KEY!
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const details   = await fetch(`https://api.themoviedb.org/3/movie/${TMDB_CORRECT_ID}?api_key=${key}`).then(r => r.json())
  await new Promise(r => setTimeout(r, 400))
  const providers = await fetch(`https://api.themoviedb.org/3/movie/${TMDB_CORRECT_ID}/watch/providers?api_key=${key}`).then(r => r.json())
  await new Promise(r => setTimeout(r, 400))
  const genresRes = await fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${key}`).then(r => r.json())

  const genre = (details.genres as { name: string }[] || []).map(g => g.name)
  const ott = ((providers.results?.[WATCH_REGION]?.flatrate ?? []) as { provider_name: string }[])
    .map(p => p.provider_name)
    .filter(n => WHITELIST.has(n))
    .map(n => n === "ZEE5" ? "Zee5" : n)

  const newRow = {
    id: `anuj_picks_m_${TMDB_CORRECT_ID}`,
    title: details.title as string,
    poster_url: `${POSTER_BASE}${details.poster_path}`,
    genre: genre.length ? genre : ["Drama"],
    year: parseInt((details.release_date as string).slice(0, 4)),
    overview: (details.overview as string)?.trim() || "No overview.",
    imdb_rating: Math.round((details.vote_average as number) * 10) / 10,
    mood: "anuj_picks",
    ott_providers: [...new Set(ott)],
  }

  console.log(`Correct entry: ${newRow.title} (${newRow.year}) | genres: ${newRow.genre.join(", ")} | OTT: ${newRow.ott_providers.join(", ") || "none"}`)

  const { error: delErr } = await supabase.from("movies").delete().eq("id", `anuj_picks_m_${TMDB_WRONG_ID}`)
  if (delErr) { console.error("Delete error:", delErr); process.exit(1) }
  console.log(`Deleted wrong entry: anuj_picks_m_${TMDB_WRONG_ID}`)

  const { error: upErr } = await supabase.from("movies").upsert([newRow], { onConflict: "id" })
  if (upErr) { console.error("Upsert error:", upErr); process.exit(1) }
  console.log(`Inserted correct entry: anuj_picks_m_${TMDB_CORRECT_ID} ✅`)
}

main().catch(e => { console.error(e); process.exit(1) })
