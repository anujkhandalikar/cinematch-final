"use client"

import { useEffect, useState, useRef, useCallback, useMemo, use } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { SwipeDeck } from "@/components/SwipeDeck"
import { Button } from "@/components/ui/button"
import { getMoviesByMoods, shuffleWithSeed, type Mood, type Movie } from "@/lib/movies"
import { toast } from "sonner"
import { Users, Play, Clock, Share2, Copy, Check, Loader2 } from "lucide-react"
import { motion } from "framer-motion"

interface Participant {
    user_id: string
    is_ready: boolean
    mood: string | null
    joined_at: string
}

export default function RoomPage({ params }: { params: Promise<{ code: string }> }) {
    const { code } = use(params)
    const router = useRouter()
    const supabase = useMemo(() => createClient(), [])

    const [status, setStatus] = useState<"waiting" | "active" | "finished">("waiting")
    const [participants, setParticipants] = useState<Participant[]>([])
    const [userId, setUserId] = useState<string>("")
    const [movies, setMovies] = useState<Movie[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [copied, setCopied] = useState(false)
    const [timeLeft, setTimeLeft] = useState(180)
    const [countdown, setCountdown] = useState<number | null>(null)
    const timerStarted = useRef(false)
    const roomSeed = useRef<string | null>(null)

    const normalizeParticipant = (row: Record<string, unknown>): Participant => ({
        user_id: (row.user_id ?? "") as string,
        is_ready: (row.is_ready ?? false) as boolean,
        mood: (row.mood ?? null) as string | null,
        joined_at: ((row.joined_at ?? row.last_seen ?? "") as string),
    })

    const fetchParticipants = useCallback(async () => {
        const { data } = await supabase
            .from("participants")
            .select("*")
            .eq("room_id", code)
            .order("joined_at", { ascending: true })

        if (data) {
            setParticipants(data.map(normalizeParticipant))
        }
    }, [supabase, code]) // supabase is now stable via useMemo

    const buildDeck = useCallback(async (parts: Participant[], seed: string) => {
        const moods = parts
            .map(p => p.mood)
            .filter((m): m is string => m !== null) as Mood[]

        if (moods.length === 0) return

        const pool = await getMoviesByMoods(moods)
        const shuffled = shuffleWithSeed(pool, seed)
        setMovies(shuffled)
    }, [])

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push("/")
                return
            }
            setUserId(user.id)

            const { data: room, error } = await supabase
                .from("rooms")
                .select("*")
                .eq("id", code)
                .single()

            if (error || !room) {
                toast.error("Room not found")
                router.push("/")
                return
            }

            setStatus(room.status)
            roomSeed.current = room.seed ?? null

            const mood = sessionStorage.getItem("selected_mood") as Mood | null

            const { error: joinError } = await supabase.from("participants").insert({
                room_id: code,
                user_id: user.id,
                is_ready: false,
                ...(mood ? { mood } : {})
            })
            if (joinError && joinError.code !== '23505') {
                console.error("Join error:", joinError)
            }

            await fetchParticipants()

            if (room.status === "active" && room.seed) {
                const { data: parts } = await supabase
                    .from("participants")
                    .select("*")
                    .eq("room_id", code)
                    .order("joined_at", { ascending: true })
                if (parts) {
                    await buildDeck(parts.map(normalizeParticipant), room.seed)
                }
            }

            const roomChannel = supabase
                .channel(`room:${code}`)
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${code}` },
                    async (payload) => {
                        const newStatus = payload.new.status
                        setStatus(newStatus)
                        if (newStatus === "active") {
                            toast.success("Game Started!")
                            const seed = payload.new.seed as string
                            roomSeed.current = seed
                            const { data: parts } = await supabase
                                .from("participants")
                                .select("*")
                                .eq("room_id", code)
                                .order("joined_at", { ascending: true })
                            if (parts && seed) {
                                await buildDeck(parts.map(normalizeParticipant), seed)
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
    }, [code, router, supabase, fetchParticipants, buildDeck])

    const toggleReady = async () => {
        const me = participants.find(p => p.user_id === userId)
        if (!me) return
        const newReady = !me.is_ready

        setParticipants(prev =>
            prev.map(p => p.user_id === userId ? { ...p, is_ready: newReady } : p)
        )

        const { error } = await supabase
            .from("participants")
            .update({ is_ready: newReady })
            .eq("room_id", code)
            .eq("user_id", userId)

        if (error) {
            console.error("Ready toggle error:", error)
            toast.error("Failed to update ready state")
            setParticipants(prev =>
                prev.map(p => p.user_id === userId ? { ...p, is_ready: !newReady } : p)
            )
        }
    }

    const allReady = participants.length === 2 && participants.every(p => p.is_ready)

    useEffect(() => {
        if (status !== "waiting") return
        const interval = setInterval(fetchParticipants, 3000)
        return () => clearInterval(interval)
    }, [status, fetchParticipants])

    useEffect(() => {
        if (!allReady || status !== "waiting") {
            setCountdown(null)
            return
        }

        setCountdown(3)
        const t1 = setTimeout(() => setCountdown(2), 1000)
        const t2 = setTimeout(() => setCountdown(1), 2000)
        const t3 = setTimeout(async () => {
            setCountdown(0)
            setStatus("active")
            await supabase
                .from("rooms")
                .update({ status: "active", started_at: new Date().toISOString() })
                .eq("id", code)
        }, 3000)

        return () => {
            clearTimeout(t1)
            clearTimeout(t2)
            clearTimeout(t3)
        }
    }, [allReady, status, supabase, code])

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
        navigator.clipboard.writeText(code)
        setCopied(true)
        toast.success("Room Code Copied!")
        setTimeout(() => setCopied(false), 2000)
    }

    const handleSwipe = async (movieId: string, direction: "left" | "right") => {
        const { error } = await supabase.from("swipes").insert({
            room_id: code,
            user_id: userId,
            movie_id: movieId,
            direction
        })

        if (error) {
            console.error("Swipe error:", error.message, "| code:", error.code, "| details:", error.details, "| hint:", error.hint)
        }

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

    // Derive the two player slots (sorted by join time)
    const sorted = [...participants].sort(
        (a, b) => new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
    )
    const player1 = sorted[0] ?? null
    const player2 = sorted[1] ?? null

    if (status === "waiting") {
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

                        {/* Two Fixed Player Slots */}
                        <div className="space-y-4">
                            <h3 className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                                <Users className="w-4 h-4" /> Players ({participants.length}/2)
                            </h3>
                            <div className="space-y-3">
                                {/* Slot 1 */}
                                {player1 ? (
                                    <div className="flex items-center justify-between p-4 bg-zinc-900/60 rounded-xl border border-zinc-800">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 flex items-center justify-center text-sm font-black text-white">
                                                P1
                                            </div>
                                            <span className="font-bold text-zinc-200 tracking-wide">
                                                {player1.user_id === userId ? "YOU" : "PLAYER 1"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {player1.user_id === userId ? (
                                                <button
                                                    onClick={toggleReady}
                                                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${
                                                        player1.is_ready
                                                            ? "bg-green-600/20 border-green-600/40 text-green-400"
                                                            : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                                                    }`}
                                                >
                                                    {player1.is_ready ? "Ready" : "Click Ready"}
                                                </button>
                                            ) : (
                                                <>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                                                        {player1.is_ready ? "Ready" : "Not Ready"}
                                                    </span>
                                                    <span className={`flex h-2.5 w-2.5 rounded-full ${
                                                        player1.is_ready
                                                            ? "bg-green-500 shadow-[0_0_10px_2px_rgba(34,197,94,0.4)]"
                                                            : "bg-zinc-600"
                                                    }`}></span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between p-4 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-zinc-900 border border-dashed border-zinc-700 flex items-center justify-center">
                                                <Loader2 className="w-4 h-4 text-zinc-600 animate-spin" />
                                            </div>
                                            <span className="font-medium text-zinc-600 tracking-wide italic">
                                                Waiting for Player 1...
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Slot 2 */}
                                {player2 ? (
                                    <div className="flex items-center justify-between p-4 bg-zinc-900/60 rounded-xl border border-zinc-800">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 flex items-center justify-center text-sm font-black text-white">
                                                P2
                                            </div>
                                            <span className="font-bold text-zinc-200 tracking-wide">
                                                {player2.user_id === userId ? "YOU" : "PLAYER 2"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {player2.user_id === userId ? (
                                                <button
                                                    onClick={toggleReady}
                                                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${
                                                        player2.is_ready
                                                            ? "bg-green-600/20 border-green-600/40 text-green-400"
                                                            : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                                                    }`}
                                                >
                                                    {player2.is_ready ? "Ready" : "Click Ready"}
                                                </button>
                                            ) : (
                                                <>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                                                        {player2.is_ready ? "Ready" : "Not Ready"}
                                                    </span>
                                                    <span className={`flex h-2.5 w-2.5 rounded-full ${
                                                        player2.is_ready
                                                            ? "bg-green-500 shadow-[0_0_10px_2px_rgba(34,197,94,0.4)]"
                                                            : "bg-zinc-600"
                                                    }`}></span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between p-4 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-zinc-900 border border-dashed border-zinc-700 flex items-center justify-center">
                                                <Loader2 className="w-4 h-4 text-zinc-600 animate-spin" />
                                            </div>
                                            <span className="font-medium text-zinc-600 tracking-wide italic">
                                                Waiting for Player 2...
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Auto-start indicator */}
                        <div className={`w-full h-16 flex items-center justify-center rounded-full text-lg font-bold uppercase tracking-wider transition-all ${
                            countdown !== null
                                ? "bg-red-600 text-white shadow-[0_0_30px_-10px_rgba(220,38,38,0.5)] animate-pulse"
                                : "bg-zinc-800 text-zinc-500"
                        }`}>
                            <Play className="w-5 h-5 mr-2 fill-current" />
                            {countdown !== null
                                ? `Starting in ${countdown}...`
                                : "Waiting for both players to ready up"}
                        </div>
                    </div>
                </motion.div>
            </div>
        )
    }

    if (status === "active") {
        return (
            <div className="flex flex-col items-center min-h-screen bg-black text-white dot-pattern overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/80 to-black pointer-events-none" />

                <header className="w-full grid grid-cols-3 items-center p-6 z-50 relative">
                    <div />
                    <div />
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

