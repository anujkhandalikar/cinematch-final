import { createClient } from "./supabase/client"

export type Mood = "imdb_top" | "light_and_fun" | "bollywood"

export interface Movie {
    id: string
    title: string
    poster_url: string
    genre: string[]
    year: number
    overview: string
    imdb_rating: number
    mood: Mood
}

const supabase = createClient()

/**
 * Fetch movies from Supabase, optionally filtered by mood.
 */
export async function fetchMovies(mood?: Mood, limit = 20): Promise<Movie[]> {
    let query = supabase
        .from("movies")
        .select("id, title, poster_url, genre, year, overview, imdb_rating, mood")
        .limit(limit)

    if (mood) {
        query = query.eq("mood", mood)
    }

    const { data, error } = await query

    if (error) {
        console.error("Failed to fetch movies:", error)
        return []
    }

    return (data ?? []) as Movie[]
}

/**
 * Fetch movies by mood from Supabase.
 */
export async function getMoviesByMood(mood: Mood): Promise<Movie[]> {
    return fetchMovies(mood, 50)
}

/**
 * Fetch specific movies by their IDs from Supabase.
 */
export async function getMoviesByIds(ids: string[]): Promise<Movie[]> {
    if (ids.length === 0) return []

    const { data, error } = await supabase
        .from("movies")
        .select("id, title, poster_url, genre, year, overview, imdb_rating, mood")
        .in("id", ids)

    if (error) {
        console.error("Failed to fetch movies by IDs:", error)
        return []
    }

    return (data ?? []) as Movie[]
}
