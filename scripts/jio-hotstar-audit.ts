import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
dotenv.config()
import { createClient } from "@supabase/supabase-js"

const MOODS = [
    { id: "imdb_top", label: "IMDb Top Rated" },
    { id: "light_and_fun", label: "Light & Fun" },
    { id: "bollywood", label: "Bollywood" },
    { id: "oscar", label: "Oscar Winners" },
    { id: "srk", label: "Shah Rukh Khan" },
    { id: "latest", label: "Latest" },
    { id: "gritty_thrillers", label: "Gritty Thrillers" },
    { id: "quick_watches", label: "Quick Watches" },
    { id: "reality_and_drama", label: "Reality & Drama" },
    { id: "whats_viral", label: "What's Viral" },
    { id: "anuj_picks", label: "Anuj's Picks" },
]

// All known Jio Hotstar / Disney+ Hotstar / JioCinema variants
const JIO_HOTSTAR_VARIANTS = new Set([
    "Jio Hotstar", "JioCinema", "Jio Cinema",
    "Disney+ Hotstar", "Disney Plus", "Hotstar", "Disney+",
])

async function main() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let all: { mood: string; ott_providers: string[] }[] = []
    let page = 0
    while (true) {
        const { data, error } = await supabase
            .from("movies")
            .select("mood, ott_providers")
            .range(page * 1000, (page + 1) * 1000 - 1)
        if (error) throw new Error(error.message)
        if (!data || data.length === 0) break
        all.push(...data)
        if (data.length < 1000) break
        page++
    }

    const counts: Record<string, number> = {}
    const totals: Record<string, number> = {}
    MOODS.forEach(m => { counts[m.id] = 0; totals[m.id] = 0 })

    all.forEach(row => {
        if (!(row.mood in counts)) return
        totals[row.mood]++
        const providers: string[] = row.ott_providers ?? []
        if (providers.some(p => JIO_HOTSTAR_VARIANTS.has(p))) counts[row.mood]++
    })

    console.log(`\nTotal DB rows fetched: ${all.length}\n`)
    console.log("Mood | Jio Hotstar | Total")
    MOODS.forEach(m => {
        console.log(`${m.label} | ${counts[m.id]} | ${totals[m.id]}`)
    })
}

main().catch(err => { console.error(err); process.exit(1) })
