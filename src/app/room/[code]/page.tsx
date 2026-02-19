"use client"

import { useEffect, useState, use } from "react"
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

    const handleCopy = () => {
        const url = `${window.location.origin}/lobby?code=${code}` // Or just the room link
        navigator.clipboard.writeText(code) // Or URL
        setCopied(true)
        toast.success("Room Code Copied!")
        setTimeout(() => setCopied(false), 2000)
    }

    // --- Game Logic ---

    const handleSwipe = async (movieId: string, direction: "left" | "right") => {
        // 1. Record Swipe (Fire and forget interaction for speed)
        const { error } = await supabase.from("swipes").insert({
            room_id: code,
            user_id: userId,
            movie_id: movieId,
            direction
        })

        if (error) console.error("Swipe error:", error)

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
            <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background dot-pattern relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-transparent pointer-events-none" />

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md space-y-8 z-10"
                >
                    <div className="text-center space-y-2">
                        <div className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1 text-xs text-zinc-400 backdrop-blur-md mb-4">
                            <span className="flex h-2 w-2 rounded-full bg-yellow-500 mr-2 animate-pulse"></span>
                            Waiting for players
                        </div>
                        <h1 className="text-5xl font-mono font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500">
                            {code}
                        </h1>
                        <p className="text-muted-foreground">Share this code to sync up</p>
                    </div>

                    <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-2xl p-6 space-y-6 shadow-2xl">
                        {/* Share Section */}
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1 h-12 text-zinc-300 border-zinc-700 hover:bg-zinc-800"
                                onClick={handleCopy}
                            >
                                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                                {copied ? "Copied" : "Copy Code"}
                            </Button>
                            <Button
                                variant="outline"
                                className="h-12 w-12 px-0 border-zinc-700 hover:bg-zinc-800"
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
                                <Share2 className="w-4 h-4" />
                            </Button>
                        </div>

                        {/* Participants List */}
                        <div className="space-y-4">
                            <h3 className="flex items-center gap-2 text-sm font-medium text-zinc-400 uppercase tracking-wider">
                                <Users className="w-4 h-4" /> Players ({participants.length})
                            </h3>
                            <div className="space-y-3">
                                {participants.map((p) => (
                                    <div key={p.user_id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold">
                                                {p.user_id.slice(0, 2).toUpperCase()}
                                            </div>
                                            <span className="font-medium text-zinc-200">
                                                {p.user_id === userId ? "You" : "Player 2"}
                                            </span>
                                        </div>
                                        <span className="flex h-2 w-2 rounded-full bg-green-500 shadow-[0_0_10px_2px_rgba(34,197,94,0.4)]"></span>
                                    </div>
                                ))}
                                {participants.length === 0 && <span className="text-sm text-muted-foreground">Waiting...</span>}
                            </div>
                        </div>

                        {/* Start Button */}
                        <Button
                            size="lg"
                            className="w-full h-14 text-lg font-bold bg-white text-black hover:bg-zinc-200 transition-all shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]"
                            onClick={startGame}
                            disabled={participants.length < 1} // Allow 1 player for testing/Solo, but ideally 2 for Dual
                        >
                            <Play className="w-5 h-5 mr-2" /> Start Session
                        </Button>
                    </div>
                </motion.div>
            </div>
        )
    }

    if (status === "active") {
        return (
            <div className="flex flex-col items-center min-h-screen bg-background text-foreground overflow-hidden">
                {/* Header */}
                <header className="w-full flex justify-between items-center p-4 z-50">
                    <div className="flex items-center gap-2 bg-zinc-900/80 backdrop-blur rounded-full px-3 py-1.5 border border-zinc-800">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="font-mono font-bold text-sm tracking-widest">{code}</span>
                    </div>

                    <div className="flex items-center gap-2 bg-zinc-900/80 backdrop-blur rounded-full px-3 py-1.5 border border-zinc-800 text-zinc-400">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">Voting</span>
                    </div>
                </header>

                {/* Game Area */}
                <div className="flex-1 w-full flex flex-col items-center justify-center relative">
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

