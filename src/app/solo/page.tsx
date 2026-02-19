"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { MOVIES } from "@/lib/movies"
import { SwipeDeck } from "@/components/SwipeDeck"
import { NudgeOverlay } from "@/components/NudgeOverlay"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Clock } from "lucide-react"

// Shuffle helper
const shuffle = <T,>(array: T[]): T[] => {
    return [...array].sort(() => Math.random() - 0.5)
}

export default function SoloPage() {
    const router = useRouter()
    const [movies, setMovies] = useState(() => shuffle(MOVIES))
    const [timeLeft, setTimeLeft] = useState(180) // 3 minutes
    const [likedMovies, setLikedMovies] = useState<string[]>([])
    const [showNudge, setShowNudge] = useState(false)
    const [nudgeDismissed, setNudgeDismissed] = useState(false)

    const NUDGE_THRESHOLD = 3

    // Ref to always have the latest likedMovies (avoids stale closure in timer)
    const likedMoviesRef = useRef(likedMovies)
    likedMoviesRef.current = likedMovies

    const finishSession = useCallback(() => {
        sessionStorage.setItem("solo_results", JSON.stringify(likedMoviesRef.current))
        router.push("/results")
    }, [router])

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer)
                    // Use ref to get latest liked movies
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
        if (direction === "right") {
            setLikedMovies((prev) => {
                const updated = [...prev, movieId]
                // Trigger nudge when reaching threshold for the first time
                if (updated.length >= NUDGE_THRESHOLD && !nudgeDismissed) {
                    setShowNudge(true)
                }
                return updated
            })
        }
    }

    const handleNudgeContinue = () => {
        setShowNudge(false)
        setNudgeDismissed(true)
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

    return (
        <div className="flex flex-col items-center justify-between min-h-screen p-4 bg-black text-white dot-pattern overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/80 to-black pointer-events-none" />

            <header className="w-full flex items-center justify-between mb-4 z-10 max-w-md mx-auto pt-4 relative">
                <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="rounded-full w-12 h-12 hover:bg-zinc-900 text-zinc-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <div className="flex items-center gap-2 bg-zinc-900/80 backdrop-blur-md rounded-full px-5 py-2 border border-zinc-800 shadow-xl">
                    <Clock className="w-4 h-4 text-red-600" />
                    <span className={`font-black text-lg tracking-widest tabular-nums ${timeLeft < 30 ? "text-red-500 animate-pulse" : "text-white"}`}>
                        {formatTime(timeLeft)}
                    </span>
                </div>
                <div className="w-12" /> {/* Spacer */}
            </header>

            <div className="flex-1 w-full flex items-center justify-center relative z-10">
                <SwipeDeck
                    movies={movies}
                    onSwipe={handleSwipe}
                    onEmpty={finishSession}
                />
            </div>

            <div className="w-full mt-8 mb-6 space-y-4 max-w-md mx-auto relative z-10">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-zinc-500">
                    <span>{likedMovies.length} liked</span>
                    <span>{movies.length} remaining</span>
                </div>
                {/* Custom Progress Bar since Shadcn Progress might be too simple */}
                <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                    <div
                        className="h-full bg-red-600 transition-all duration-1000 ease-linear rounded-full"
                        style={{ width: `${((180 - timeLeft) / 180) * 100}%` }}
                    />
                </div>

                <Button
                    className="w-full h-14 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold uppercase tracking-wider rounded-full transition-all"
                    onClick={finishSession}
                >
                    Review Shortlist ({likedMovies.length})
                </Button>
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
