"use client"

import { useState } from "react"
import { Movie } from "@/lib/movies"
import { MovieCard } from "./MovieCard"
import { AnimatePresence } from "framer-motion"

interface SwipeDeckProps {
    movies: Movie[]
    onSwipe: (movieId: string, direction: "left" | "right") => void
    onEmpty: () => void
}

export function SwipeDeck({ movies, onSwipe, onEmpty }: SwipeDeckProps) {
    const [activeMovies, setActiveMovies] = useState(movies)
    const [history, setHistory] = useState<Movie[]>([]) // For potential Undo feature later

    const handleSwipe = (direction: "left" | "right") => {
        if (activeMovies.length === 0) return

        const currentMovie = activeMovies[0]
        onSwipe(currentMovie.id, direction)

        // Remove top card
        const newMovies = activeMovies.slice(1)
        setActiveMovies(newMovies)

        if (newMovies.length === 0) {
            onEmpty()
        }
    }

    // Optimize rendering: only show top 3 cards to keep DOM light
    const visibleMovies = activeMovies.slice(0, 3)

    return (
        <div className="relative w-full max-w-[350px] h-[500px] flex items-center justify-center">
            <AnimatePresence>
                {visibleMovies.map((movie, index) => (
                    <MovieCard
                        key={movie.id}
                        movie={movie}
                        index={index}
                        onSwipe={handleSwipe}
                    />
                ))}
            </AnimatePresence>


        </div>
    )
}
