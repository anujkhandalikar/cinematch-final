import * as dotenv from "dotenv"
import * as fs from "fs"
import * as path from "path"
import { createClient } from "@supabase/supabase-js"

dotenv.config({ path: ".env" })

const MOODS = [
    { id: "imdb_top", label: "IMDb Rated Top" },
    { id: "light_and_fun", label: "Something Light & Fun" },
    { id: "bollywood", label: "Bollywood" },
    { id: "oscar", label: "Oscar Winners" },
    { id: "srk", label: "Shah Rukh Khan" },
    { id: "latest", label: "The \"February 2026\" Vibe" },
    { id: "gritty_thrillers", label: "Gritty Thrillers" },
    { id: "quick_watches", label: "Quick Watches" },
    { id: "reality_and_drama", label: "Reality & Drama" },
    { id: "whats_viral", label: "What's Viral" }
]

async function main() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("Missing Supabase credentials in .env")
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Fetch all movies with mood and ott_providers using a pagination loop to bypass 1000 limit
    let allFetchedMovies: any[] = []
    let page = 0
    while (true) {
        const { data: moviesChunk, error } = await supabase
            .from("movies")
            .select("mood, ott_providers")
            .range(page * 1000, (page + 1) * 1000 - 1)

        if (error) {
            console.error("Failed to fetch movies:", error)
            process.exit(1)
        }

        if (!moviesChunk || moviesChunk.length === 0) break

        allFetchedMovies.push(...moviesChunk)
        if (moviesChunk.length < 1000) break
        page++
    }
    const movies = allFetchedMovies

    // 1. Identify all unique OTT providers across the entire dataset
    const allProviders = new Set<string>()
    movies.forEach(movie => {
        if (movie.ott_providers) {
            movie.ott_providers.forEach((p: string) => allProviders.add(p))
        }
    })
    const otts = Array.from(allProviders).sort()

    // 2. Build the data matrix
    // Row: Mood Label, Col: OTT Provider -> Count
    const stats: Record<string, Record<string, number>> = {}
    const totals: Record<string, number> = {}
    MOODS.forEach(m => {
        stats[m.label] = {}
        totals[m.label] = 0
        otts.forEach(ott => {
            stats[m.label][ott] = 0
        })
    })

    // 3. Populate counts
    movies.forEach(movie => {
        const moodConfig = MOODS.find(m => m.id === movie.mood)
        if (moodConfig) {
            totals[moodConfig.label]++
            if (movie.ott_providers) {
                movie.ott_providers.forEach((p: string) => {
                    if (stats[moodConfig.label] && stats[moodConfig.label][p] !== undefined) {
                        stats[moodConfig.label][p]++
                    }
                })
            }
        }
    })

    // 4. Generate Aligned ASCII Table
    // Calculate column widths
    const colWidths: number[] = [26] // Moods column
    otts.forEach(ott => colWidths.push(Math.max(ott.length, 6)))
    colWidths.push(12) // Total Movies column

    const buildRow = (columns: string[]) => {
        return "| " + columns.map((col, i) => col.padEnd(colWidths[i])).join(" | ") + " |\n"
    }

    const separator = "+" + colWidths.map(w => "-".repeat(w + 2)).join("+") + "+\n"

    let textTable = separator
    textTable += buildRow(["Moods (Pills)", ...otts, "Total Movies"])
    textTable += separator

    MOODS.forEach(m => {
        const rowData = otts.map(ott => stats[m.label][ott].toString())
        textTable += buildRow([m.label, ...rowData, totals[m.label].toString()])
    })
    textTable += separator

    // 5. Write to File
    const outputPath = path.join(process.cwd(), "ott-stats.txt")
    fs.writeFileSync(outputPath, textTable)

    console.log(`Successfully generated ASCII table and saved to ${outputPath}`)
}

main().catch(err => {
    console.error(err)
    process.exit(1)
})
