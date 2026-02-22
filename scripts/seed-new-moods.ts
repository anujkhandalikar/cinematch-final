import * as dotenv from "dotenv"
dotenv.config({ path: ".env" })
import { createClient } from "@supabase/supabase-js"

type Mood = "latest" | "gritty_thrillers" | "quick_watches" | "reality_and_drama" | "whats_viral"

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

const newMovies: SupabaseMovieRow[] = [
    // LATEST
    {
        id: "latest_1",
        title: "The Night Agent S3",
        poster_url: "https://image.tmdb.org/t/p/w500/x11A0P4OQk9uFsqC3XhO687IqL5.jpg", // dummy poster 1
        genre: ["Action", "Thriller", "Drama"],
        year: 2026,
        overview: "While monitoring an emergency line, a vigilant FBI agent answers a call that plunges him into a deadly conspiracy.",
        imdb_rating: 7.5,
        mood: "latest",
        ott_providers: ["Netflix"]
    },
    {
        id: "latest_2",
        title: "Panchayat S5",
        poster_url: "https://image.tmdb.org/t/p/w500/tVTiwqO3a8Ltsn4wL5uL26mXXcE.jpg", // dummy poster 2
        genre: ["Comedy", "Drama"],
        year: 2026,
        overview: "A comedy-drama, which captures the journey of an engineering graduate who for lack of a better job option joins as secretary of a Panchayat office.",
        imdb_rating: 8.9,
        mood: "latest",
        ott_providers: ["Amazon Prime Video"]
    },

    // GRITTY THRILLERS
    {
        id: "gritty_1",
        title: "The Rip",
        poster_url: "https://image.tmdb.org/t/p/w500/r0Xm7t8Kow18B3S4N95T3E1nU0W.jpg", // dummy
        genre: ["Crime", "Thriller"],
        year: 2026,
        overview: "A dark, intense thriller following a bank heist gone wrong in Boston.",
        imdb_rating: 8.1,
        mood: "gritty_thrillers",
        ott_providers: ["Netflix"]
    },
    {
        id: "gritty_2",
        title: "Kohrra S2",
        poster_url: "https://image.tmdb.org/t/p/w500/8tZYtuWezpWIKdwh1Mkt0tr9GYj.jpg", // dummy
        genre: ["Crime", "Mystery", "Drama"],
        year: 2026,
        overview: "When an NRI bridegroom is found dead days before his wedding, two cops must unravel the troubling case.",
        imdb_rating: 8.5,
        mood: "gritty_thrillers",
        ott_providers: ["Netflix"]
    },

    // QUICK WATCHES
    {
        id: "quick_1",
        title: "The Wonderful Story of Henry Sugar",
        poster_url: "https://image.tmdb.org/t/p/w500/5R1xZ4m4UcwR9V9zV7MofS2q983.jpg",
        genre: ["Comedy", "Drama"],
        year: 2023,
        overview: "A rich man learns about a guru who can see without using his eyes and then sets out to master the skill in order to cheat at gambling. (Runtime: 39 mins)",
        imdb_rating: 7.4,
        mood: "quick_watches",
        ott_providers: ["Netflix"]
    },

    // REALITY & DRAMA
    {
        id: "reality_1",
        title: "Love Is Blind S10",
        poster_url: "https://image.tmdb.org/t/p/w500/uDO8zWDhfWzExZ53XvL0n00ZqGw.jpg", // dummy
        genre: ["Reality"],
        year: 2026,
        overview: "Singles who want to be loved for who they are, rather than what they look like, have signed up for a less conventional approach to modern dating.",
        imdb_rating: 6.2,
        mood: "reality_and_drama",
        ott_providers: ["Netflix"]
    },
    {
        id: "reality_2",
        title: "Shark Tank India",
        poster_url: "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUKGnSxQbUgZ.jpg", // dummy
        genre: ["Reality", "Family"],
        year: 2026,
        overview: "Aspiring entrepreneurs pitch their business models to a panel of investors and persuade them to invest money in their idea.",
        imdb_rating: 8.7,
        mood: "reality_and_drama",
        ott_providers: ["SonyLIV"]
    },

    // WHAT'S VIRAL
    {
        id: "viral_1",
        title: "Bridgerton S4",
        poster_url: "https://image.tmdb.org/t/p/w500/vHkGjw2wB1wB0XpIofO2h8dO00D.jpg", // dummy
        genre: ["Drama", "Romance"],
        year: 2026,
        overview: "Wealth, lust, and betrayal set against the backdrop of Regency-era England.",
        imdb_rating: 7.4,
        mood: "whats_viral",
        ott_providers: ["Netflix"]
    },
    {
        id: "viral_2",
        title: "The Artful Dodger",
        poster_url: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg", // dummy
        genre: ["Crime", "Drama"],
        year: 2024,
        overview: "In 1850s Australia, Jack Dawkins works as a surgeon while concealing his past as a pickpocket from the London slums.",
        imdb_rating: 7.9,
        mood: "whats_viral",
        ott_providers: ["Disney+"]
    }
]

async function main() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error("Missing Supabase credentials in .env.local")
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    console.log(`Upserting ${newMovies.length} new mood movies...`)

    const { error } = await supabase.from("movies").upsert(newMovies, { onConflict: "id" })

    if (error) {
        console.error("Failed to insert new movies:", error)
        process.exit(1)
    }

    console.log("Successfully inserted movies!")
}

main().catch(err => {
    console.error(err)
    process.exit(1)
})
