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

const AI_LOADING_STEPS = ["Thinking...", "Scanning movies...", "Ranking picks..."]

export default function SoloPage() {
    const router = useRouter()
    const [movies, setMovies] = useState<Movie[]>([])
    const [selectedOtt, setSelectedOtt] = useState<string[]>([])
    const [aiLoadingStep, setAiLoadingStep] = useState(0)
    const [timeLeft, setTimeLeft] = useState(180) // 3 minutes
    const [timeUp, setTimeUp] = useState(false)
    const [streamDone, setStreamDone] = useState(true)
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

    // Ref to always have latest movies (needed in finishSession for TMDB path)
    const moviesRef = useRef<Movie[]>([])
    useEffect(() => {
        moviesRef.current = movies
    }, [movies])

    // Tracks whether the current session used TMDB (full movie objects) vs local DB (IDs)
    const isTmdbSessionRef = useRef(false)

    // Guard against React Strict Mode double-invocation consuming the sessionStorage key twice
    const movieLoadStartedRef = useRef(false)

    // Load movies on mount — either via AI search or mood
    useEffect(() => {
        if (movieLoadStartedRef.current) return
        movieLoadStartedRef.current = true

        const ottJson = sessionStorage.getItem("selected_ott")
        let ottPlatforms: string[] = []
        if (ottJson) {
            try { ottPlatforms = JSON.parse(ottJson) as string[] } catch { /* ignore */ }
        }
        setSelectedOtt(ottPlatforms)

        const aiSearchQuery = sessionStorage.getItem("ai_search_query")
        const mood = sessionStorage.getItem("selected_mood") as Mood | null

        if (aiSearchQuery) {
            sessionStorage.removeItem("ai_search_query")
            setStreamDone(false)

            // Cycle through loading messages while waiting
            let step = 0
            setAiLoadingStep(0)
            const interval = setInterval(() => {
                step = Math.min(step + 1, AI_LOADING_STEPS.length - 1)
                setAiLoadingStep(step)
            }, 1200)

            fetch("/api/ai-search?stream=1", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: aiSearchQuery }),
            })
                .then((r) => {
                    console.log("[ai-search] request:", { query: aiSearchQuery, status: r.status })
                    const contentType = r.headers.get("content-type") ?? ""
                    if (contentType.includes("application/x-ndjson") && r.body) {
                        return r
                    }
                    return r.json()
                })
                .then((result: Response | { type: "factual"; movies: Movie[] } | { type: "vibe"; mood: Mood } | { type: "error"; error: string; message?: string }) => {
                    clearInterval(interval)
                    if (result instanceof Response) {
                        const reader = result.body?.getReader()
                        if (!reader) {
                            router.push("/mood")
                            return
                        }
                        const decoder = new TextDecoder()
                        let buffer = ""
                        let total = 0
                        isTmdbSessionRef.current = true
                        setMovies([])
                        const readLoop = async () => {
                            while (true) {
                                const { value, done } = await reader.read()
                                if (done) break
                                buffer += decoder.decode(value, { stream: true })
                                const lines = buffer.split("\n")
                                buffer = lines.pop() ?? ""
                                for (const line of lines) {
                                    const trimmed = line.trim()
                                    if (!trimmed) continue
                                    const msg = JSON.parse(trimmed) as { type: string; movies?: Movie[]; count?: number; debug?: unknown }
                                    if (msg.type === "meta") {
                                        console.log("[ai-search] response:", msg)
                                    } else if (msg.type === "batch" && msg.movies) {
                                        total += msg.movies.length
                                        setMovies((prev) => [...prev, ...msg.movies!])
                                    } else if (msg.type === "done") {
                                        setStreamDone(true)
                                        trackSessionStart({ mode: "solo", mood: "imdb_top", ott_count: 0, movie_count: total })
                                    }
                                }
                            }
                        }
                        readLoop().catch(() => router.push("/mood"))
                        return
                    }
                    console.log("[ai-search] response:", result)
                    if (result.type === "error") {
                        console.error("[ai-search] error:", result.message ?? result.error)
                        router.push("/mood")
                        return
                    }
                    if (result.type === "factual") {
                        // TMDB path — use full movie objects directly, no DB fetch needed
                        isTmdbSessionRef.current = true
                        setStreamDone(true)
                        setMovies(result.movies)
                        trackSessionStart({ mode: "solo", mood: "imdb_top", ott_count: 0, movie_count: result.movies.length })
                    } else {
                        // Vibe path — same as mood pill flow
                        isTmdbSessionRef.current = false
                        getMoviesByMood(result.mood).then((allMovies: Movie[]) => {
                            let ordered: Movie[]
                            if (ottPlatforms.length > 0) {
                                const matched = allMovies.filter((m) => m.ott_providers?.some((p) => ottPlatforms.includes(p)))
                                const rest = allMovies.filter((m) => !m.ott_providers?.some((p) => ottPlatforms.includes(p)))
                                ordered = [...shuffle(matched), ...shuffle(rest)]
                            } else {
                                ordered = shuffle(allMovies)
                            }
                            setMovies(ordered)
                            setStreamDone(true)
                            trackSessionStart({ mode: "solo", mood: result.mood, ott_count: ottPlatforms.length, movie_count: ordered.length })
                        })
                    }
                })
                .catch(() => {
                    clearInterval(interval)
                    router.push("/mood")
                })
        } else if (mood) {
            getMoviesByMood(mood).then((allMovies: Movie[]) => {
                let ordered: Movie[]
                if (ottPlatforms.length > 0) {
                    const matched = allMovies.filter((m) => m.ott_providers?.some((p) => ottPlatforms.includes(p)))
                    const rest = allMovies.filter((m) => !m.ott_providers?.some((p) => ottPlatforms.includes(p)))
                    ordered = [...shuffle(matched), ...shuffle(rest)]
                } else {
                    ordered = shuffle(allMovies)
                }
                setMovies(ordered)
                setStreamDone(true)
                trackSessionStart({ mode: "solo", mood, ott_count: ottPlatforms.length, movie_count: ordered.length })
            })
        } else {
            router.push("/mood")
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router])

    const finishSession = useCallback((completion: "manual" | "timer" | "deck_empty" = "manual") => {
        trackSessionComplete({
            mode: "solo",
            liked_count: likedMoviesRef.current.length,
            time_remaining: timeLeft,
            completion,
        })
        if (isTmdbSessionRef.current) {
            const likedObjects = moviesRef.current.filter(m => likedMoviesRef.current.includes(m.id))
            sessionStorage.setItem("tmdb_solo_results", JSON.stringify(likedObjects))
            sessionStorage.removeItem("solo_results")
        } else {
            sessionStorage.setItem("solo_results", JSON.stringify(likedMoviesRef.current))
            sessionStorage.removeItem("tmdb_solo_results")
        }
        router.push("/results")
    }, [router, timeLeft])

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer)
                    setTimeUp(true)
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [router])

    useEffect(() => {
        if (!timeUp) return
        setShowNudge(false)
        trackSessionComplete({
            mode: "solo",
            liked_count: likedMoviesRef.current.length,
            time_remaining: 0,
            completion: "timer",
        })
        if (isTmdbSessionRef.current) {
            const likedObjects = moviesRef.current.filter(m => likedMoviesRef.current.includes(m.id))
            sessionStorage.setItem("tmdb_solo_results", JSON.stringify(likedObjects))
            sessionStorage.removeItem("solo_results")
        } else {
            sessionStorage.setItem("solo_results", JSON.stringify(likedMoviesRef.current))
            sessionStorage.removeItem("tmdb_solo_results")
        }
        router.push("/results")
    }, [router, timeUp])

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
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                    <p key={aiLoadingStep} className="text-sm font-bold uppercase tracking-widest text-zinc-400 animate-pulse">
                        {AI_LOADING_STEPS[aiLoadingStep]}
                    </p>
                </div>
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
                            canEnd={streamDone}
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
