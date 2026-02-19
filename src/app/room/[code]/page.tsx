"use client"

import { useEffect, useState, useRef, use } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { SwipeDeck } from "@/components/SwipeDeck"
import { Button } from "@/components/ui/button"
import { fetchMovies, Movie } from "@/lib/movies"
import { toast } from "sonner"
import { Users, Play, Clock, Share2, Copy, Check, Loader2 } from "lucide-react"
import { motion } from "framer-motion"

// Types
interface Participant {
    user_id: string
    is_ready: boolean
    joined_at: string
}

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
    const { code } = use(params)
    const router = useRouter()
    const supabase = createClient()

    const [status, setStatus] = useState<"waiting" | "active" | "finished">("waiting")
    const [participants, setParticipants] = useState<Participant[]>([])
    const [userId, setUserId] = useState<string>("")
    const [movies, setMovies] = useState<Movie[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [copied, setCopied] = useState(false)
    const [timeLeft, setTimeLeft] = useState(180) // 3 minutes in seconds
    const timerStarted = useRef(false)

    // Initialization
    useEffect(() => {
        const init = async () => {
            // 1. Auth Check
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push("/")
                return
            }
            setUserId(user.id)

            // 2. Load Room Data
            const { data: room, error } = await supabase
                .from("rooms")
                .select("*")
                .eq("id", code) // Changed 'code' to 'id' based on schema
                .single()

            if (error || !room) {
                toast.error("Room not found")
                router.push("/")
                return
            }

            setStatus(room.status)

            // 3. Join Room (if not already)
            // The Lobby already inserts into participants, but good to be safe/idempotent
            const { error: joinError } = await supabase.from("participants").upsert({
                room_id: code,
                user_id: user.id,
                is_ready: true // Assume ready on entry for simplicity
            }, { onConflict: 'room_id,user_id' })

            if (joinError) console.error("Join error:", joinError)

            // 4. Fetch Movies (Pre-fetch for smooth start)
            const movieList = await fetchMovies()
            setMovies(movieList)

            // 5. Initial Participant Fetch
            fetchParticipants()

            // 6. Subscribe to Room Status & Participants
            const roomChannel = supabase
                .channel(`room:${code}`)
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${code}` },
                    (payload) => {
                        const newStatus = payload.new.status
                        if (newStatus !== status) {
                            setStatus(newStatus)
                            if (newStatus === "active") {
                                toast.success("Game Started!")
                            }
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'participants', filter: `room_id=eq.${code}` },
                    () => fetchParticipants()
                )
                .subscribe()

            setIsLoading(false)

            return () => {
                supabase.removeChannel(roomChannel)
            }
        }

        init()
    }, [code, router, supabase])

    const fetchParticipants = async () => {
        const { data } = await supabase
            .from("participants")
            .select("*")
            .eq("room_id", code)

        if (data) {
            setParticipants(data)
        }
    }

    const startGame = async () => {
        // Optimistic update
        setStatus("active")

        await supabase
            .from("rooms")
            .update({ status: "active", started_at: new Date().toISOString() })
            .eq("id", code)
    }

    // Start countdown timer when game becomes active
    useEffect(() => {
        if (status === "active" && !timerStarted.current) {
            timerStarted.current = true
            const interval = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(interval)
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
            return () => clearInterval(interval)
        }
    }, [status])

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, "0")
        const s = (seconds % 60).toString().padStart(2, "0")
        return `${m}:${s}`
    }

    const handleCopy = () => {
        const url = `${window.location.origin}/lobby?code=${code}` // Or just the room link
        navigator.clipboard.writeText(code) // Or URL
        setCopied(true)
        toast.success("Room Code Copied!")
        setTimeout(() => setCopied(false), 2000)
    }

    // --- Game Logic ---

    const handleSwipe = async (movieId: string, direction: "left" | "right") => {
        // 1. Record Swipe (fire-and-forget for speed)
        const { error } = await supabase.from("swipes").insert({
            room_id: code,
            user_id: userId,
            movie_id: movieId,  // text ID from static list
            direction
        })

        if (error) {
            // Log full details for debugging (the {} was because error is not a plain object)
            console.error("Swipe error:", error.message, "| code:", error.code, "| details:", error.details, "| hint:", error.hint)
            // Don't return — still try to check for match client-side
        }

        // 2. Check Match (only on right swipe)
        if (direction === "right") {
            const { data: otherSwipes } = await supabase
                .from("swipes")
                .select("*")
                .eq("room_id", code)
                .eq("movie_id", movieId)
                .eq("direction", "right")
                .neq("user_id", userId)

            if (otherSwipes && otherSwipes.length > 0) {
                const movie = movies.find(m => m.id === movieId)
                toast.success(`It's a Match! ${movie?.title}`, {
                    duration: 4000,
                    position: "top-center",
                    icon: <span className="text-xl">🎉</span>
                })
            }
        }
    }

    const handleEmpty = () => {
        toast("Stack finished! Waiting for partner...")
    }

    // --- Render ---

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (status === "waiting") {
        const isHost = participants[0]?.user_id === userId // Simple host check

        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-black text-white dot-pattern relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/80 to-black pointer-events-none" />

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md space-y-8 z-10 relative"
                >
                    <div className="text-center space-y-6">
                        <span className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900/80 px-4 py-1.5 text-xs font-medium text-zinc-400 uppercase tracking-widest backdrop-blur-sm">
                            <span className="flex h-2 w-2 rounded-full bg-red-600 mr-2 animate-pulse"></span>
                            Waiting for players
                        </span>

                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                            <h1 className="relative text-8xl font-black tracking-tighter text-white drop-shadow-2xl">
                                {code}
                            </h1>
                        </div>
                        <p className="text-zinc-500 font-medium tracking-wide">Share this code to sync up</p>
                    </div>

                    <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/60 rounded-2xl p-8 space-y-8 shadow-2xl">
                        {/* Share Section */}
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1 h-14 border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-900 hover:text-white font-bold text-base uppercase tracking-wider rounded-full transition-all"
                                onClick={handleCopy}
                            >
                                {copied ? <Check className="w-5 h-5 mr-2 text-green-500" /> : <Copy className="w-5 h-5 mr-2" />}
                                {copied ? "Copied" : "Copy Code"}
                            </Button>
                            <Button
                                variant="outline"
                                className="h-14 w-14 px-0 border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-900 hover:text-white rounded-full transition-all"
                                onClick={() => {
                                    if (navigator.share) {
                                        navigator.share({
                                            title: 'Join my CineMatch Room',
                                            text: `Join my room using code: ${code}`,
                                            url: window.location.href
                                        })
                                    } else {
                                        handleCopy()
                                    }
                                }}
                            >
                                <Share2 className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Participants List */}
                        <div className="space-y-4">
                            <h3 className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                                <Users className="w-4 h-4" /> Players ({participants.length})
                            </h3>
                            <div className="space-y-3">
                                {participants.map((p) => (
                                    <div key={p.user_id} className="flex items-center justify-between p-4 bg-zinc-900/60 rounded-xl border border-zinc-800">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 flex items-center justify-center text-sm font-black text-white">
                                                {p.user_id.slice(0, 2).toUpperCase()}
                                            </div>
                                            <span className="font-bold text-zinc-200 tracking-wide">
                                                {p.user_id === userId ? "YOU" : "PLAYER 2"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Ready</span>
                                            <span className="flex h-2.5 w-2.5 rounded-full bg-red-600 shadow-[0_0_10px_2px_rgba(220,38,38,0.4)] animate-pulse"></span>
                                        </div>
                                    </div>
                                ))}
                                {participants.length === 0 && <span className="text-sm text-zinc-500 italic">Waiting for connection...</span>}
                            </div>
                        </div>

                        {/* Start Button */}
                        <Button
                            size="lg"
                            className="w-full h-16 text-lg bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wider rounded-full shadow-[0_0_30px_-10px_rgba(220,38,38,0.5)] transition-all hover:scale-[1.02]"
                            onClick={startGame}
                            disabled={participants.length < 1} // Allow 1 player for testing/Solo, but ideally 2 for Dual
                        >
                            <Play className="w-5 h-5 mr-2 fill-current" /> Start Session
                        </Button>
                    </div>
                </motion.div>
            </div>
        )
    }

    if (status === "active") {
        return (
            <div className="flex flex-col items-center min-h-screen bg-black text-white dot-pattern overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/80 to-black pointer-events-none" />

                {/* Header */}
                <header className="w-full grid grid-cols-3 items-center p-6 z-50 relative">
                    {/* Left spacer for centering */}
                    <div />

                    {/* Center spacer */}
                    <div />

                    {/* Timer on the right */}
                    <div className="flex justify-end">
                        <div className={`flex items-center gap-2 bg-zinc-900/80 backdrop-blur-md rounded-full px-5 py-2.5 border shadow-xl transition-colors duration-500 ${timeLeft <= 30
                            ? "border-red-600/60 shadow-[0_0_20px_-5px_rgba(220,38,38,0.4)]"
                            : "border-zinc-800"
                            }`}>
                            <Clock className={`w-4 h-4 transition-colors duration-500 ${timeLeft <= 30 ? "text-red-400" : "text-red-600"}`} />
                            <span className={`text-sm font-black tracking-widest tabular-nums transition-colors duration-500 ${timeLeft <= 30 ? "text-red-400" : "text-zinc-300"
                                }`}>{formatTime(timeLeft)}</span>
                        </div>
                    </div>
                </header>

                {/* Game Area */}
                <div className="flex-1 w-full flex flex-col items-center justify-center relative z-10 pb-20">
                    <SwipeDeck
                        movies={movies}
                        onSwipe={handleSwipe}
                        onEmpty={handleEmpty}
                    />
                </div>
            </div>
        )
    }

    return null
}

