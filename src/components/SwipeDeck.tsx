"use client"

import { useState, useEffect, useRef } from "react"
import { Movie } from "@/lib/movies"
import { MovieCard } from "./MovieCard"
import { AnimatePresence } from "framer-motion"

interface SwipeDeckProps {
    movies: Movie[]
    onSwipe: (movieId: string, direction: "left" | "right") => void
    onEmpty: () => void
    disabled?: boolean
    selectedOtt?: string[]
    canEnd?: boolean
}

export function SwipeDeck({ movies, onSwipe, onEmpty, disabled, selectedOtt, canEnd = true }: SwipeDeckProps) {
    const [activeMovies, setActiveMovies] = useState(movies)
    const [synopsisOpen, setSynopsisOpen] = useState(false)
    const prevMoviesLenRef = useRef(0)
    const didEmptyRef = useRef(false)

    // Keep refs current so keyboard handler never has stale closures
    const handleSwipeRef = useRef<(dir: "left" | "right") => void>(() => {})
    const synopsisOpenRef = useRef(synopsisOpen)
    synopsisOpenRef.current = synopsisOpen

    // Sync activeMovies when the movies prop changes (streaming append)
    useEffect(() => {
        if (movies.length === 0) {
            setActiveMovies([])
            didEmptyRef.current = false
            prevMoviesLenRef.current = 0
            return
        }

        const prevLen = prevMoviesLenRef.current
        if (prevLen === 0) {
            setActiveMovies(movies)
            didEmptyRef.current = false
            prevMoviesLenRef.current = movies.length
            return
        }

        if (movies.length > prevLen) {
            const newItems = movies.slice(prevLen)
            setActiveMovies((prev) => [...prev, ...newItems])
            prevMoviesLenRef.current = movies.length
        }
    }, [movies])

    useEffect(() => {
        if (canEnd && activeMovies.length === 0) {
            if (!didEmptyRef.current) {
                didEmptyRef.current = true
                onEmpty()
            }
        }
    }, [canEnd, activeMovies.length, onEmpty])

    const handleSwipe = (direction: "left" | "right") => {
        if (activeMovies.length === 0) return

        setSynopsisOpen(false)
        const currentMovie = activeMovies[0]
        onSwipe(currentMovie.id, direction)

        const newMovies = activeMovies.slice(1)
        setActiveMovies(newMovies)

        if (newMovies.length === 0 && canEnd) {
            onEmpty()
        }
    }

    // Always keep ref pointing at latest handleSwipe (avoids stale closure in keyboard effect)
    handleSwipeRef.current = handleSwipe

    // Keyboard controls — registered once, reads latest state via refs
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (disabled) return
            const tag = (e.target as Element).tagName
            if (tag === "INPUT" || tag === "TEXTAREA") return

            if (e.key === "ArrowRight") {
                e.preventDefault()
                if (!synopsisOpenRef.current) handleSwipeRef.current("right")
            } else if (e.key === "ArrowLeft") {
                e.preventDefault()
                if (!synopsisOpenRef.current) handleSwipeRef.current("left")
            } else if (e.key === " ") {
                e.preventDefault()
                setSynopsisOpen((prev) => !prev)
            } else if (e.key === "Escape") {
                setSynopsisOpen(false)
            }
        }

        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [disabled])

    // Optimize rendering: only show top 3 cards to keep DOM light
    const visibleMovies = activeMovies.slice(0, 3)

    return (
        <div
            className="relative w-full h-full max-w-full sm:max-w-[400px] max-h-[650px] flex items-center justify-center mx-auto touch-none"
        >
            <AnimatePresence>
                {visibleMovies.map((movie, index) => (
                    <MovieCard
                        key={movie.id}
                        movie={movie}
                        index={index}
                        onSwipe={handleSwipe}
                        disabled={disabled}
                        selectedOtt={selectedOtt}
                        synopsisOpen={index === 0 ? synopsisOpen : false}
                        onSynopsisChange={index === 0 ? setSynopsisOpen : undefined}
                    />
                ))}
            </AnimatePresence>
        </div>
    )
}
