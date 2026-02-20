import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"

dotenv.config()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
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

async function auditPosters() {
    console.log("Fetching all movies from database...\n")

    const { data: movies, error } = await supabase
        .from("movies")
        .select("id, title, year, poster_url, mood")
        .order("mood")

    if (error) {
        console.error("Error fetching movies:", error.message)
        process.exit(1)
    }

    console.log(`Found ${movies.length} movies. Checking poster URLs...\n`)

    const broken: typeof movies = []
    const working: typeof movies = []

    for (const movie of movies) {
        const isValid = await checkPosterUrl(movie.poster_url)

        if (isValid) {
            working.push(movie)
            process.stdout.write("✓")
        } else {
            broken.push(movie)
            process.stdout.write("✗")
        }
    }

    console.log("\n\n" + "=".repeat(60))
    console.log("AUDIT RESULTS")
    console.log("=".repeat(60))

    console.log(`\nTotal movies: ${movies.length}`)
    console.log(`Working posters: ${working.length}`)
    console.log(`Broken posters: ${broken.length}`)

    if (broken.length > 0) {
        console.log("\n" + "-".repeat(60))
        console.log("BROKEN POSTERS:")
        console.log("-".repeat(60))

        for (const movie of broken) {
            console.log(`\n[${movie.mood}] ${movie.id}`)
            console.log(`  Title: ${movie.title} (${movie.year})`)
            console.log(`  URL: ${movie.poster_url}`)
        }
    }

    console.log("\n")
}

auditPosters()
