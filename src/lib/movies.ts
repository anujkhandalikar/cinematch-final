import { createClient } from "./supabase/client"

export interface Movie {
    id: string
    title: string
    poster_url: string
    genre: string[]
    year: number
    overview: string
    imdb_rating: number
}

// Static fallback data
const STATIC_MOVIES: Movie[] = [
    {
        id: "1",
        title: "Inception",
        poster_url: "https://image.tmdb.org/t/p/w500/9gk7admal4zlH35Ke3txs0w506y.jpg",
        genre: ["Sci-Fi", "Thriller"],
        year: 2010,
        overview: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
        imdb_rating: 8.8
    },
    {
        id: "2",
        title: "The Dark Knight",
        poster_url: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
        genre: ["Action", "Crime", "Drama"],
        year: 2008,
        overview: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
        imdb_rating: 9.0
    },
    {
        id: "3",
        title: "Interstellar",
        poster_url: "https://image.tmdb.org/t/p/w500/gEU2QniL6C8zEfVfy23rUnKEtp.jpg",
        genre: ["Sci-Fi", "Drama"],
        year: 2014,
        overview: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
        imdb_rating: 8.6
    },
    {
        id: "4",
        title: "Parasite",
        poster_url: "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
        genre: ["Thriller", "Drama"],
        year: 2019,
        overview: "Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.",
        imdb_rating: 8.5
    },
    {
        id: "5",
        title: "Avengers: Endgame",
        poster_url: "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
        genre: ["Action", "Sci-Fi"],
        year: 2019,
        overview: "After the devastating events of Infinity War, the universe is in ruins. With the help of remaining allies, the Avengers assemble once more in order to reverse Thanos' actions and restore balance to the universe.",
        imdb_rating: 8.4
    },
    {
        id: "6",
        title: "Spirited Away",
        poster_url: "https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUKGnSxQbUgZ.jpg",
        genre: ["Animation", "Family"],
        year: 2001,
        overview: "A young girl, Chihiro, becomes trapped in a strange new world of spirits. When her parents undergo a mysterious transformation, she must call upon the courage she never knew she had to free her family.",
        imdb_rating: 8.6
    },
    {
        id: "7",
        title: "The Godfather",
        poster_url: "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
        genre: ["Crime", "Drama"],
        year: 1972,
        overview: "The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.",
        imdb_rating: 9.2
    },
    {
        id: "8",
        title: "Pulp Fiction",
        poster_url: "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
        genre: ["Crime", "Drama"],
        year: 1994,
        overview: "The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.",
        imdb_rating: 8.9
    },
    {
        id: "9",
        title: "The Matrix",
        poster_url: "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
        genre: ["Sci-Fi", "Action"],
        year: 1999,
        overview: "Set in the 22nd century, The Matrix tells the story of a computer hacker who joins a group of underground insurgents fighting the vast and powerful computers who now rule the earth.",
        imdb_rating: 8.7
    },
    {
        id: "10",
        title: "Forrest Gump",
        poster_url: "https://image.tmdb.org/t/p/w500/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg",
        genre: ["Drama", "Romance"],
        year: 1994,
        overview: "A man with a low IQ has accomplished great things in his life and been present during significant historic events—in each case, far exceeding what anyone imagined he could do. But despite all he has achieved, his one true love eludes him.",
        imdb_rating: 8.8
    }
]

export const MOVIES = STATIC_MOVIES; // Export for legacy support if needed

export async function fetchMovies(category?: string, limit = 20): Promise<Movie[]> {
    // For MVP, strictly use static data to ensure reliability
    // In a real app, we would query the DB here.
    // Simulating async delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check if we REALLY want to use the DB (if the table exists)
    // const supabase = createClient()
    // const { data, error } = await supabase.from('movies').select('*').limit(limit)
    // if (!error && data && data.length > 0) return data.map(...)

    return STATIC_MOVIES;
}
