"use client"

import { useState, useEffect } from "react"
import { Movie } from "@/lib/movies"
import { MovieCard } from "./MovieCard"
import { AnimatePresence } from "framer-motion"

interface SwipeDeckProps {
    movies: Movie[]
    onSwipe: (movieId: string, direction: "left" | "right") => void
    onEmpty: () => void
    disabled?: boolean
    selectedOtt?: string[]
}

export function SwipeDeck({ movies, onSwipe, onEmpty, disabled, selectedOtt }: SwipeDeckProps) {
    const [activeMovies, setActiveMovies] = useState(movies)

    // Sync activeMovies when the movies prop changes (e.g. async load for non-host)
    useEffect(() => {
        if (movies.length > 0 && activeMovies.length === 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setActiveMovies(movies)
        }
    }, [movies, activeMovies.length])

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
        <div className="relative w-full aspect-[2/3] max-w-[400px] max-h-[650px] flex items-center justify-center mx-auto touch-none">
            <AnimatePresence>
                {visibleMovies.map((movie, index) => (
                    <MovieCard
                        key={movie.id}
                        movie={movie}
                        index={index}
                        onSwipe={handleSwipe}
                        disabled={disabled}
                        selectedOtt={selectedOtt}
                    />
                ))}
            </AnimatePresence>
        </div>
    )
}
