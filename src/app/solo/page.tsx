"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { MOVIES } from "@/lib/movies"
import { SwipeDeck } from "@/components/SwipeDeck"
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

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer)
                    finishSession()
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [])

    const finishSession = () => {
        // Save results and redirect
        sessionStorage.setItem("solo_results", JSON.stringify(likedMovies))
        router.push("/results") // We'll create this next
    }

    const handleSwipe = (movieId: string, direction: "left" | "right") => {
        if (direction === "right") {
            setLikedMovies((prev) => [...prev, movieId])
        }
    }

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m}:${s.toString().padStart(2, "0")}`
    }

    return (
        <div className="flex flex-col items-center justify-between min-h-screen p-4 bg-background overflow-hidden max-w-md mx-auto relative">
            <header className="w-full flex items-center justify-between mb-4 z-10">
                <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex items-center gap-2 font-mono text-xl font-bold tabular-nums">
                    <Clock className="w-5 h-5 text-primary" />
                    <span className={timeLeft < 30 ? "text-red-500 animate-pulse" : ""}>
                        {formatTime(timeLeft)}
                    </span>
                </div>
                <div className="w-10" /> {/* Spacer */}
            </header>

            <div className="flex-1 w-full flex items-center justify-center">
                <SwipeDeck
                    movies={movies}
                    onSwipe={handleSwipe}
                    onEmpty={finishSession}
                />
            </div>

            <div className="w-full mt-8 mb-4 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{likedMovies.length} liked</span>
                    <span>{movies.length} remaining</span>
                </div>
                <Progress value={(180 - timeLeft) / 1.8} className="h-2" />
                <Button
                    variant="secondary"
                    className="w-full mt-4"
                    onClick={finishSession}
                >
                    Review Shortlist ({likedMovies.length})
                </Button>
            </div>
        </div>
    )
}
