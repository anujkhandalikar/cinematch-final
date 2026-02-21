"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { getMoviesByMood, type Mood, type Movie } from "@/lib/movies"
import { SwipeDeck } from "@/components/SwipeDeck"
import { NudgeOverlay } from "@/components/NudgeOverlay"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Clock } from "lucide-react"
import { trackSessionStart, trackSessionComplete, trackSwipe, trackNudgeShown, trackNavBack } from "@/lib/analytics"

// Shuffle helper
const shuffle = <T,>(array: T[]): T[] => {
    return [...array].sort(() => Math.random() - 0.5)
}

export default function SoloPage() {
    const router = useRouter()
    const [movies, setMovies] = useState<Movie[]>([])
    const [selectedOtt, setSelectedOtt] = useState<string[]>([])
    const [timeLeft, setTimeLeft] = useState(180) // 3 minutes
    const [likedMovies, setLikedMovies] = useState<string[]>([])
    const [showNudge, setShowNudge] = useState(false)
    const lastNudgeThresholdRef = useRef(0)

    const NUDGE_THRESHOLD = 3
    const swipeIndexRef = useRef(0)
    const [swipedCount, setSwipedCount] = useState(0)

    // Ref to always have the latest likedMovies (avoids stale closure in timer)
    const likedMoviesRef = useRef(likedMovies)
    useEffect(() => {
        likedMoviesRef.current = likedMovies
    }, [likedMovies])

    // Load mood-filtered movies on mount
    useEffect(() => {
        const mood = sessionStorage.getItem("selected_mood") as Mood | null
        if (mood) {
            getMoviesByMood(mood).then((allMovies: Movie[]) => {
                const ottJson = sessionStorage.getItem("selected_ott")
                let ottPlatforms: string[] = []

                if (ottJson) {
                    try {
                        ottPlatforms = JSON.parse(ottJson) as string[]
                    } catch { /* ignore */ }
                }

                setSelectedOtt(ottPlatforms)

                let ordered: Movie[]
                if (ottPlatforms.length > 0) {
                    const matched = allMovies.filter((m) =>
                        m.ott_providers?.some((p) => ottPlatforms.includes(p))
                    )
                    const rest = allMovies.filter((m) =>
                        !m.ott_providers?.some((p) => ottPlatforms.includes(p))
                    )
                    ordered = [...shuffle(matched), ...shuffle(rest)]
                } else {
                    ordered = shuffle(allMovies)
                }

                setMovies(ordered)
                trackSessionStart({ mode: "solo", mood, ott_count: ottPlatforms.length, movie_count: ordered.length })
            })
        } else {
            // Fallback: if no mood selected, redirect back
            router.push("/mood")
        }
    }, [router])

    const finishSession = useCallback((completion: "manual" | "timer" | "deck_empty" = "manual") => {
        trackSessionComplete({
            mode: "solo",
            liked_count: likedMoviesRef.current.length,
            time_remaining: timeLeft,
            completion,
        })
        sessionStorage.setItem("solo_results", JSON.stringify(likedMoviesRef.current))
        router.push("/results")
    }, [router, timeLeft])

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer)
                    setShowNudge(false)
                    trackSessionComplete({
                        mode: "solo",
                        liked_count: likedMoviesRef.current.length,
                        time_remaining: 0,
                        completion: "timer",
                    })
                    sessionStorage.setItem("solo_results", JSON.stringify(likedMoviesRef.current))
                    router.push("/results")
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [router])

    const handleSwipe = (movieId: string, direction: "left" | "right") => {
        const currentMovie = movies.find(m => m.id === movieId)
        trackSwipe({
            direction,
            movie_id: movieId,
            movie_title: currentMovie?.title ?? "",
            position: swipeIndexRef.current,
            mode: "solo",
        })
        swipeIndexRef.current += 1
        setSwipedCount(prev => prev + 1)

        if (direction === "right") {
            setLikedMovies((prev) => {
                const updated = [...prev, movieId]
                const nextThreshold = lastNudgeThresholdRef.current + NUDGE_THRESHOLD
                if (updated.length >= nextThreshold) {
                    lastNudgeThresholdRef.current = nextThreshold
                    trackNudgeShown(updated.length, "solo")
                    setShowNudge(true)
                }
                return updated
            })
        }
    }

    const handleNudgeContinue = () => {
        setShowNudge(false)
    }

    const handleNudgeCheckShortlist = () => {
        setShowNudge(false)
        finishSession()
    }

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m}:${s.toString().padStart(2, "0")}`
    }

    // Wait until movies are loaded
    if (movies.length === 0) {
        return (
            <div className="flex h-screen items-center justify-center bg-black text-white dot-pattern">
                <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-between h-[calc(100dvh-50px)] overflow-hidden p-4 bg-black text-white dot-pattern relative">
            <div className="fixed inset-0 bg-gradient-to-b from-transparent via-black/80 to-black pointer-events-none z-0" />

            <header className="w-full grid grid-cols-3 items-center shrink-0 mb-2 z-10 max-w-md mx-auto pt-2 relative">
                <div className="flex justify-start">
                    <Button variant="ghost" size="icon" onClick={() => { trackNavBack("solo"); router.push("/"); }} className="rounded-full w-10 h-10 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </div>
                {/* Center spacer */}
                <div />
                {/* Timer on the right */}
                <div className="flex justify-end">
                    <div className={`flex items-center gap-2 bg-zinc-900/80 backdrop-blur-md rounded-full px-3 py-1.5 border shadow-xl transition-colors duration-500 ${timeLeft < 30 ? "border-red-600/60 shadow-[0_0_20px_-5px_rgba(220,38,38,0.4)]" : "border-zinc-800"}`}>
                        <Clock className={`w-4 h-4 transition-colors duration-500 ${timeLeft < 30 ? "text-red-400" : "text-red-600"}`} />
                        <span className={`font-black text-base tracking-widest tabular-nums transition-colors duration-500 ${timeLeft < 30 ? "text-red-500 animate-pulse" : "text-white"}`}>
                            {formatTime(timeLeft)}
                        </span>
                    </div>
                </div>
            </header>

            <div className={`flex-1 w-full relative z-10 ${showNudge ? "pointer-events-none" : ""}`}>
                <div className="absolute inset-0 flex items-center justify-center py-2 pointer-events-none">
                    <div className="h-full aspect-[2/3] pointer-events-auto">
                        <SwipeDeck
                            movies={movies}
                            onSwipe={handleSwipe}
                            onEmpty={() => finishSession("deck_empty")}
                            selectedOtt={selectedOtt}
                        />
                    </div>
                </div>
            </div>

            <div className="w-full shrink-0 mt-2 mb-1 space-y-2 max-w-md mx-auto relative z-10">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    <span>{likedMovies.length} liked</span>
                    <span>{movies.length - swipedCount} remaining</span>
                </div>
                {/* Custom Progress Bar since Shadcn Progress might be too simple */}
                <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                    <div
                        className="h-full bg-red-600 transition-all duration-1000 ease-linear rounded-full"
                        style={{ width: `${((180 - timeLeft) / 180) * 100}%` }}
                    />
                </div>

                {likedMovies.length > 0 && (
                    <Button
                        className="w-full h-11 text-sm bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold uppercase tracking-wider rounded-full transition-all"
                        onClick={() => finishSession("manual")}
                    >
                        Review Shortlist ({likedMovies.length})
                    </Button>
                )}
            </div>

            {/* S5 Nudge Overlay */}
            <NudgeOverlay
                show={showNudge}
                likedCount={likedMovies.length}
                onContinue={handleNudgeContinue}
                onCheckShortlist={handleNudgeCheckShortlist}
            />
        </div>
    )
}
