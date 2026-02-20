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

// ─── IMDb Rated Top (10 movies) ───────────────────────────────────────────────
const IMDB_TOP: Movie[] = [
    {
        id: "imdb_1",
        title: "The Shawshank Redemption",
        poster_url: "https://image.tmdb.org/t/p/w500/9cjIGRQL1r6UKGiGSCnHKIBq5SB.jpg",
        genre: ["Drama"],
        year: 1994,
        overview: "Imprisoned in the 1940s for the double murder of his wife and her lover, upstanding banker Andy Dufresne begins a new life at the Shawshank prison.",
        imdb_rating: 9.3,
        mood: "imdb_top"
    },
    {
        id: "imdb_2",
        title: "The Godfather",
        poster_url: "https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
        genre: ["Crime", "Drama"],
        year: 1972,
        overview: "The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.",
        imdb_rating: 9.2,
        mood: "imdb_top"
    },
    {
        id: "imdb_3",
        title: "The Dark Knight",
        poster_url: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
        genre: ["Action", "Crime", "Drama"],
        year: 2008,
        overview: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
        imdb_rating: 9.0,
        mood: "imdb_top"
    },
    {
        id: "imdb_4",
        title: "Pulp Fiction",
        poster_url: "https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg",
        genre: ["Crime", "Drama"],
        year: 1994,
        overview: "The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.",
        imdb_rating: 8.9,
        mood: "imdb_top"
    },
    {
        id: "imdb_5",
        title: "Inception",
        poster_url: "https://image.tmdb.org/t/p/w500/9gk7admal4zlH35Ke3txs0w506y.jpg",
        genre: ["Sci-Fi", "Thriller"],
        year: 2010,
        overview: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
        imdb_rating: 8.8,
        mood: "imdb_top"
    },
    {
        id: "imdb_6",
        title: "Forrest Gump",
        poster_url: "https://image.tmdb.org/t/p/w500/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg",
        genre: ["Drama", "Romance"],
        year: 1994,
        overview: "A man with a low IQ has accomplished great things in his life and been present during significant historic events—in each case, far exceeding what anyone imagined he could do.",
        imdb_rating: 8.8,
        mood: "imdb_top"
    },
    {
        id: "imdb_7",
        title: "The Matrix",
        poster_url: "https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg",
        genre: ["Sci-Fi", "Action"],
        year: 1999,
        overview: "Set in the 22nd century, The Matrix tells the story of a computer hacker who joins a group of underground insurgents fighting the vast and powerful computers who now rule the earth.",
        imdb_rating: 8.7,
        mood: "imdb_top"
    },
    {
        id: "imdb_8",
        title: "Interstellar",
        poster_url: "https://image.tmdb.org/t/p/w500/gEU2QniL6C8zEfVfy23rUnKEtp.jpg",
        genre: ["Sci-Fi", "Drama"],
        year: 2014,
        overview: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
        imdb_rating: 8.6,
        mood: "imdb_top"
    },
    {
        id: "imdb_9",
        title: "Fight Club",
        poster_url: "https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
        genre: ["Drama", "Thriller"],
        year: 1999,
        overview: "An insomniac office worker and a devil-may-care soap maker form an underground fight club that evolves into much more.",
        imdb_rating: 8.8,
        mood: "imdb_top"
    },
    {
        id: "imdb_10",
        title: "Schindler's List",
        poster_url: "https://image.tmdb.org/t/p/w500/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg",
        genre: ["Drama", "History"],
        year: 1993,
        overview: "In German-occupied Poland during World War II, industrialist Oskar Schindler gradually becomes concerned for his Jewish workforce after witnessing their persecution by the Nazis.",
        imdb_rating: 9.0,
        mood: "imdb_top"
    }
]

// ─── Something Light and Fun (10 movies) ──────────────────────────────────────
const LIGHT_AND_FUN: Movie[] = [
    {
        id: "fun_1",
        title: "The Grand Budapest Hotel",
        poster_url: "https://image.tmdb.org/t/p/w500/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg",
        genre: ["Comedy", "Drama"],
        year: 2014,
        overview: "The adventures of Gustave H, a legendary concierge at a famous European hotel between the wars, and Zero Moustafa, the lobby boy who becomes his most trusted friend.",
        imdb_rating: 8.1,
        mood: "light_and_fun"
    },
    {
        id: "fun_2",
        title: "Superbad",
        poster_url: "https://image.tmdb.org/t/p/w500/ek8e8txUyUwd2BNqj6lFEerJfbq.jpg",
        genre: ["Comedy"],
        year: 2007,
        overview: "Two co-dependent high school seniors are forced to deal with separation anxiety after their plan to stage a booze-soaked party goes awry.",
        imdb_rating: 7.6,
        mood: "light_and_fun"
    },
    {
        id: "fun_3",
        title: "Mean Girls",
        poster_url: "https://image.tmdb.org/t/p/w500/fXm3YKXAEjx7d2tIWDC9OJREbGZ.jpg",
        genre: ["Comedy"],
        year: 2004,
        overview: "Cady Heron is a hit with The Plastics, the A-list girl clique at her new school, until she makes the mistake of falling for Aaron Samuels.",
        imdb_rating: 7.1,
        mood: "light_and_fun"
    },
    {
        id: "fun_4",
        title: "Ferris Bueller's Day Off",
        poster_url: "https://image.tmdb.org/t/p/w500/9LTQMiTyKPITLnJdrjPpdBXJFyz.jpg",
        genre: ["Comedy"],
        year: 1986,
        overview: "A high school wise guy is determined to have a day off from school, despite what the Principal thinks of that.",
        imdb_rating: 7.8,
        mood: "light_and_fun"
    },
    {
        id: "fun_5",
        title: "The Hangover",
        poster_url: "https://image.tmdb.org/t/p/w500/uluhlXubGu1VxU63X9VHCLWDAYP.jpg",
        genre: ["Comedy"],
        year: 2009,
        overview: "Three buddies wake up from a bachelor party in Las Vegas, with no memory of the previous night and the bachelor missing.",
        imdb_rating: 7.7,
        mood: "light_and_fun"
    },
    {
        id: "fun_6",
        title: "Legally Blonde",
        poster_url: "https://image.tmdb.org/t/p/w500/ljeUiaiEYgqfVbA3pQ1VIFeyVPB.jpg",
        genre: ["Comedy", "Romance"],
        year: 2001,
        overview: "Elle Woods, a fashionable sorority queen, is dumped by her boyfriend. She decides to follow him to law school. While she is there, she figures out that there is more to her than just looks.",
        imdb_rating: 6.4,
        mood: "light_and_fun"
    },
    {
        id: "fun_7",
        title: "Bridesmaids",
        poster_url: "https://image.tmdb.org/t/p/w500/gFadDjMcwBJIcb0y8VIBjK7l2ry.jpg",
        genre: ["Comedy"],
        year: 2011,
        overview: "Competition between the maid of honor and a bridesmaid over who is the bride's best friend threatens to upend the life of an idealistic woman.",
        imdb_rating: 6.8,
        mood: "light_and_fun"
    },
    {
        id: "fun_8",
        title: "Crazy Rich Asians",
        poster_url: "https://image.tmdb.org/t/p/w500/1XxL4LJ5WHdrcYcihEZUCgNCpAW.jpg",
        genre: ["Comedy", "Romance", "Drama"],
        year: 2018,
        overview: "An economics professor accompanies her boyfriend to Singapore for his best friend's wedding, only to be thrust into the spotlight of Southeast Asia's most influential family.",
        imdb_rating: 6.9,
        mood: "light_and_fun"
    },
    {
        id: "fun_9",
        title: "Clueless",
        poster_url: "https://image.tmdb.org/t/p/w500/8AwVTcgpTnmeqNpIzSj7gkVOLBT.jpg",
        genre: ["Comedy", "Romance"],
        year: 1995,
        overview: "A rich high school student tries to boost a new pupil's popularity, but reckons without the other girl's taste and personality.",
        imdb_rating: 6.9,
        mood: "light_and_fun"
    },
    {
        id: "fun_10",
        title: "Zootopia",
        poster_url: "https://image.tmdb.org/t/p/w500/hlK0e0wAQ3VLuJcsfIYPvb4JVud.jpg",
        genre: ["Animation", "Comedy", "Family"],
        year: 2016,
        overview: "In a city of anthropomorphic animals, a rookie bunny cop and a cynical con artist fox must work together to uncover a conspiracy.",
        imdb_rating: 8.0,
        mood: "light_and_fun"
    }
]

// ─── Bollywood (10 movies) ────────────────────────────────────────────────────
const BOLLYWOOD: Movie[] = [
    {
        id: "bolly_1",
        title: "3 Idiots",
        poster_url: "https://image.tmdb.org/t/p/w500/66A9MqXOyVFAkO1bc3JSMUhSHtx.jpg",
        genre: ["Comedy", "Drama"],
        year: 2009,
        overview: "Two friends are searching for their long lost companion. They revisit their college days and recall the memories of their friend who inspired them to think differently.",
        imdb_rating: 8.4,
        mood: "bollywood"
    },
    {
        id: "bolly_2",
        title: "Dilwale Dulhania Le Jayenge",
        poster_url: "https://image.tmdb.org/t/p/w500/2CAL2433ZeIihfX1Hb2139CX0pW.jpg",
        genre: ["Drama", "Romance", "Musical"],
        year: 1995,
        overview: "When Raj meets Simran in Europe, it isn't love at first sight but when Simran moves to India for an arranged marriage, love makes its presence felt.",
        imdb_rating: 8.1,
        mood: "bollywood"
    },
    {
        id: "bolly_3",
        title: "Dangal",
        poster_url: "https://image.tmdb.org/t/p/w500/fZPSd91yGE9fCcCe6OoQr6E3Bev.jpg",
        genre: ["Action", "Biography", "Drama"],
        year: 2016,
        overview: "Former wrestler Mahavir Singh Phogat trains his daughters Geeta and Babita to become India's first world-class female wrestlers.",
        imdb_rating: 8.4,
        mood: "bollywood"
    },
    {
        id: "bolly_4",
        title: "Gully Boy",
        poster_url: "https://image.tmdb.org/t/p/w500/1DDAaIIcNMyMGTn0IoVpJ8USVkT.jpg",
        genre: ["Drama", "Music"],
        year: 2019,
        overview: "A coming-of-age story about an aspiring street rapper from the slums of Mumbai.",
        imdb_rating: 7.9,
        mood: "bollywood"
    },
    {
        id: "bolly_5",
        title: "Zindagi Na Milegi Dobara",
        poster_url: "https://image.tmdb.org/t/p/w500/v1eCAaiclAOHJkXLzQSL7B2G3e7.jpg",
        genre: ["Comedy", "Drama", "Romance"],
        year: 2011,
        overview: "Three friends decide to turn their fantasy vacation into reality after one of their friends gets engaged.",
        imdb_rating: 8.1,
        mood: "bollywood"
    },
    {
        id: "bolly_6",
        title: "Dil Chahta Hai",
        poster_url: "https://image.tmdb.org/t/p/w500/qHtMxFO0a7UaIn9nJAl0FMcqhB3.jpg",
        genre: ["Comedy", "Drama", "Romance"],
        year: 2001,
        overview: "Three inseparable childhood friends are just out of college. Nothing comes between them, until they each fall in love.",
        imdb_rating: 8.1,
        mood: "bollywood"
    },
    {
        id: "bolly_7",
        title: "Queen",
        poster_url: "https://image.tmdb.org/t/p/w500/8pnCOsJjin4IWafHOBOqZU2jGi0.jpg",
        genre: ["Comedy", "Drama"],
        year: 2014,
        overview: "A Delhi girl from a traditional family sets out on a solo honeymoon after her fiancé calls off their wedding. What follows is an eye-opening experience.",
        imdb_rating: 8.2,
        mood: "bollywood"
    },
    {
        id: "bolly_8",
        title: "Andhadhun",
        poster_url: "https://image.tmdb.org/t/p/w500/lyLpHJdoBNahkpHZhn6TVVnIiAW.jpg",
        genre: ["Crime", "Thriller"],
        year: 2018,
        overview: "A series of mysterious events change the life of a blind pianist, who must now report a crime that he should technically know nothing about.",
        imdb_rating: 8.3,
        mood: "bollywood"
    },
    {
        id: "bolly_9",
        title: "Lagaan",
        poster_url: "https://image.tmdb.org/t/p/w500/hUPkHjprffpoWWzQmUaXTb6hGKl.jpg",
        genre: ["Drama", "Musical", "Sport"],
        year: 2001,
        overview: "The people of a small village in Victorian India stake their future on a game of cricket against their ruthless British rulers.",
        imdb_rating: 8.1,
        mood: "bollywood"
    },
    {
        id: "bolly_10",
        title: "Bajrangi Bhaijaan",
        poster_url: "https://image.tmdb.org/t/p/w500/nkRqQuo53OyAVDVkNNqaek2WNKP.jpg",
        genre: ["Comedy", "Drama"],
        year: 2015,
        overview: "An Indian man with a magnanimous heart takes a young mute Pakistani girl back to her homeland to re-unite her with her family.",
        imdb_rating: 8.0,
        mood: "bollywood"
    }
]

// ─── Combined ─────────────────────────────────────────────────────────────────
const STATIC_MOVIES: Movie[] = [...IMDB_TOP, ...LIGHT_AND_FUN, ...BOLLYWOOD]

export const MOVIES = STATIC_MOVIES

export function getMoviesByMood(mood: Mood): Movie[] {
    return STATIC_MOVIES.filter(m => m.mood === mood)
}

export async function fetchMovies(mood?: Mood, limit = 20): Promise<Movie[]> {
    // For MVP, strictly use static data to ensure reliability
    await new Promise(resolve => setTimeout(resolve, 300))

    if (mood) {
        return getMoviesByMood(mood)
    }

    return STATIC_MOVIES
}
