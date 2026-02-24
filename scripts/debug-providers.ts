import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
dotenv.config()

async function check(id: number, title: string, type: "movie" | "tv" = "movie") {
    const key = process.env.TMDB_API_KEY
    const url = `https://api.themoviedb.org/3/${type}/${id}/watch/providers?api_key=${key}`
    const res = await fetch(url)
    const data: any = await res.json()
    const flatrate = data.results?.IN?.flatrate ?? []
    console.log(`\n${title} (${type} ID ${id}):`)
    if (flatrate.length === 0) {
        console.log("  No flatrate providers in India")
    } else {
        flatrate.forEach((p: any) => console.log(`  ID ${p.provider_id}: ${p.provider_name}`))
    }
}

async function main() {
    await check(976573, "Elemental (Disney/Pixar)")
    await check(585511, "Luca (Disney/Pixar)")
    await check(508947, "Turning Red (Disney/Pixar)")
    await check(399566, "Godzilla vs Kong")
    await check(161940, "Baahubali")
    // Quick watches movie that had Disney+ tagged previously
    await check(920, "Cars (Pixar)")
    await check(10193, "Toy Story 3")
    // Check a known JioCinema show
    await check(87917, "Bigg Boss", "tv")
}

main().catch(console.error)
