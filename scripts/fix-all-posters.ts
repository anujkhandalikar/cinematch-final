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

async function checkPosterUrl(url: string): Promise<boolean> {
    try {
        const response = await fetch(url, { method: "HEAD" })
        return response.ok
    } catch {
        return false
    }
}

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

async function fixAllPosters() {
    console.log("Fetching all movies from database...\n")

    const { data: movies, error } = await supabase
        .from("movies")
        .select("id, title, year, poster_url")

    if (error) {
        console.error("Error fetching movies:", error.message)
        process.exit(1)
    }

    console.log(`Found ${movies.length} movies. Checking for broken posters...\n`)

    let fixed = 0
    let failed = 0
    let alreadyWorking = 0

    for (const movie of movies) {
        const isValid = await checkPosterUrl(movie.poster_url)

        if (isValid) {
            alreadyWorking++
            console.log(`✓ ${movie.title} - poster OK`)
            continue
        }

        console.log(`✗ ${movie.title} - broken, fetching from TMDB...`)

        const newPosterUrl = await searchTMDB(movie.title, movie.year)

        if (newPosterUrl) {
            const { error: updateError } = await supabase
                .from("movies")
                .update({ poster_url: newPosterUrl })
                .eq("id", movie.id)

            if (updateError) {
                console.log(`  ✗ Failed to update: ${updateError.message}`)
                failed++
            } else {
                console.log(`  ✓ Fixed: ${newPosterUrl}`)
                fixed++
            }
        } else {
            console.log(`  ✗ No poster found on TMDB`)
            failed++
        }
    }

    console.log("\n" + "=".repeat(50))
    console.log("SUMMARY")
    console.log("=".repeat(50))
    console.log(`Already working: ${alreadyWorking}`)
    console.log(`Fixed: ${fixed}`)
    console.log(`Failed: ${failed}`)
    console.log("=".repeat(50))
}

fixAllPosters()
