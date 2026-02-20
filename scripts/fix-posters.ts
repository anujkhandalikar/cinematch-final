import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"

dotenv.config()

const TMDB_API_KEY = process.env.TMDB_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!TMDB_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("Missing environment variables")
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const MOVIES_TO_FIX = [
    { id: "srk_1", title: "Swades", year: 2004 },
    { id: "srk_5", title: "Veer-Zaara", year: 2004 },
]

async function searchTMDB(title: string, year: number): Promise<string | null> {
    const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&year=${year}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.results && data.results.length > 0) {
        const posterPath = data.results[0].poster_path
        if (posterPath) {
            return `https://image.tmdb.org/t/p/w500${posterPath}`
        }
    }
    return null
}

async function fixPosters() {
    console.log("Fetching correct poster URLs from TMDB...\n")

    for (const movie of MOVIES_TO_FIX) {
        console.log(`Searching for: ${movie.title} (${movie.year})`)

        const posterUrl = await searchTMDB(movie.title, movie.year)

        if (posterUrl) {
            console.log(`  Found: ${posterUrl}`)

            const { error } = await supabase
                .from("movies")
                .update({ poster_url: posterUrl })
                .eq("id", movie.id)

            if (error) {
                console.error(`  Error updating ${movie.id}:`, error.message)
            } else {
                console.log(`  Updated ${movie.id} successfully!`)
            }
        } else {
            console.log(`  No poster found for ${movie.title}`)
        }

        console.log()
    }

    console.log("Done!")
}

fixPosters()
