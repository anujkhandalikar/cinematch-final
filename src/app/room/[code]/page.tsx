"use client"

import { useEffect, useState, useRef, useCallback, useMemo, use } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { SwipeDeck } from "@/components/SwipeDeck"
import { Button } from "@/components/ui/button"
import { getMoviesByMoods, shuffleWithSeed, type Mood, type Movie } from "@/lib/movies"
import { toast } from "sonner"
import { NudgeOverlay } from "@/components/NudgeOverlay"
import { PauseOverlay } from "@/components/PauseOverlay"
import { Users, Play, Clock, Share2, Copy, Check, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import type { RealtimeChannel } from "@supabase/supabase-js"
import {
    trackSessionStart,
    trackSessionComplete,
    trackSwipe,
    trackNudgeShown,
    trackRoomCodeCopied,
    trackRoomShared,
    trackPlayerReady,
    trackMutualMatch,
} from "@/lib/analytics"

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

    const [status, setStatus] = useState<"waiting" | "active" | "paused" | "finished">("waiting")
    const [participants, setParticipants] = useState<Participant[]>([])
    const [userId, setUserId] = useState<string>("")
    const [movies, setMovies] = useState<Movie[]>([])
    const [selectedOtt, setSelectedOtt] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [copied, setCopied] = useState(false)
    const [timeLeft, setTimeLeft] = useState(180)
    const [countdown, setCountdown] = useState<number | null>(null)
    const timerStarted = useRef(false)
    const roomSeed = useRef<string | null>(null)
    const createdBy = useRef<string | null>(null)
    const userIdRef = useRef<string>("")
    const myRightSwipesRef = useRef<Set<string>>(new Set())
    const otherRightSwipesRef = useRef<Set<string>>(new Set())
    const [mutualMatches, setMutualMatches] = useState<string[]>([])
    const [showNudge, setShowNudge] = useState(false)
    const [showPauseOverlay, setShowPauseOverlay] = useState(false)
    const lastNudgeThresholdRef = useRef(0)
    const navigatingRef = useRef(false)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const channelRef = useRef<RealtimeChannel | null>(null)
    const [myLikedCount, setMyLikedCount] = useState(0)
    const [swipedCount, setSwipedCount] = useState(0)
    const [isHost, setIsHost] = useState(false)
    const NUDGE_THRESHOLD = 3

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

        const ottJson = sessionStorage.getItem("selected_ott")
        let ottPlatforms: string[] = []
        if (ottJson) {
            try { ottPlatforms = JSON.parse(ottJson) as string[] } catch { /* ignore */ }
        }
        setSelectedOtt(ottPlatforms)

        let ordered: Movie[]
        if (ottPlatforms.length > 0) {
            const matched = pool.filter((m) =>
                m.ott_providers?.some((p) => ottPlatforms.includes(p))
            )
            const rest = pool.filter((m) =>
                !m.ott_providers?.some((p) => ottPlatforms.includes(p))
            )
            ordered = [...shuffleWithSeed(matched, seed), ...shuffleWithSeed(rest, seed)]
        } else {
            ordered = shuffleWithSeed(pool, seed)
        }

        setMovies(ordered)
    }, [])

    const fetchMutualMatches = useCallback(async () => {
        const { data: rightSwipes } = await supabase
            .from("swipes")
            .select("movie_id, user_id")
            .eq("room_id", code)
            .eq("direction", "right")

        if (!rightSwipes) return []

        const counts = new Map<string, Set<string>>()
        for (const s of rightSwipes) {
            if (!counts.has(s.movie_id)) counts.set(s.movie_id, new Set())
            counts.get(s.movie_id)!.add(s.user_id)
        }
        const mutual = [...counts.entries()]
            .filter(([, users]) => users.size >= 2)
            .map(([movieId]) => movieId)

        setMutualMatches(mutual)
        return mutual
    }, [supabase, code])

    const checkNudge = useCallback(async () => {
        if (createdBy.current !== userIdRef.current) return

        const mutual = await fetchMutualMatches()

        const nextThreshold = lastNudgeThresholdRef.current + NUDGE_THRESHOLD
        if (mutual.length >= nextThreshold) {
            lastNudgeThresholdRef.current = nextThreshold
            trackMutualMatch(code, mutual.length)
            trackNudgeShown(mutual.length, "dual")
            await supabase.from("rooms").update({ status: "paused" }).eq("id", code)
            channelRef.current?.send({
                type: "broadcast",
                event: "room_status",
                payload: { status: "paused", matchCount: mutual.length },
            })
            setShowNudge(true)
        }
    }, [supabase, code, fetchMutualMatches])

    const finishAndNavigate = useCallback(async () => {
        if (navigatingRef.current) return
        navigatingRef.current = true

        trackSessionComplete({
            mode: "dual",
            liked_count: myLikedCount,
            time_remaining: timeLeft,
            completion: timeLeft <= 0 ? "timer" : "manual",
        })

        await supabase.from("rooms").update({ status: "finished" }).eq("id", code)
        channelRef.current?.send({
            type: "broadcast",
            event: "room_status",
            payload: { status: "finished" },
        })

        const { data: rightSwipes } = await supabase
            .from("swipes")
            .select("movie_id, user_id")
            .eq("room_id", code)
            .eq("direction", "right")

        if (rightSwipes) {
            const counts = new Map<string, Set<string>>()
            for (const s of rightSwipes) {
                if (!counts.has(s.movie_id)) counts.set(s.movie_id, new Set())
                counts.get(s.movie_id)!.add(s.user_id)
            }
            const mutualIds = [...counts.entries()]
                .filter(([, users]) => users.size >= 2)
                .map(([movieId]) => movieId)

            sessionStorage.setItem("duo_results", JSON.stringify(mutualIds))
        }

        router.push("/results")
    }, [supabase, code, router, myLikedCount, timeLeft])

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push("/")
                return
            }
            setUserId(user.id)
            userIdRef.current = user.id

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
            createdBy.current = room.created_by ?? null
            setIsHost(room.created_by === user.id)

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

            if ((room.status === "active" || room.status === "paused") && room.seed) {
                const { data: parts } = await supabase
                    .from("participants")
                    .select("*")
                    .eq("room_id", code)
                    .order("joined_at", { ascending: true })
                if (parts) {
                    await buildDeck(parts.map(normalizeParticipant), room.seed)
                }

                const { data: allSwipes } = await supabase
                    .from("swipes")
                    .select("movie_id, user_id, direction")
                    .eq("room_id", code)

                if (allSwipes) {
                    let myLikes = 0
                    let totalSwiped = 0
                    for (const s of allSwipes) {
                        if (s.user_id === user.id) {
                            totalSwiped++
                            if (s.direction === "right") {
                                myRightSwipesRef.current.add(s.movie_id)
                                myLikes++
                            }
                        } else if (s.direction === "right") {
                            otherRightSwipesRef.current.add(s.movie_id)
                        }
                    }
                    setMyLikedCount(myLikes)
                    setSwipedCount(totalSwiped)
                    const mutual = [...myRightSwipesRef.current].filter(id => otherRightSwipesRef.current.has(id))
                    setMutualMatches(mutual)
                }

                if (room.status === "paused" && room.created_by === user.id) {
                    // Set threshold to current mutual count so next nudge triggers at +3
                    const mutualCount = [...myRightSwipesRef.current].filter(id => otherRightSwipesRef.current.has(id)).length
                    lastNudgeThresholdRef.current = Math.floor(mutualCount / NUDGE_THRESHOLD) * NUDGE_THRESHOLD
                    setShowNudge(true)
                } else if (room.status === "paused") {
                    setShowPauseOverlay(true)
                }
            }

            if (room.status === "finished") {
                finishAndNavigate()
                return
            }

            const roomChannel = supabase
                .channel(`room:${code}`)
                .on('broadcast', { event: 'room_status' }, (payload) => {
                    const msg = payload.payload as { status: string; matchCount?: number }
                    if (msg.status === "paused") {
                        setStatus("paused")
                        setShowPauseOverlay(true)
                        if (msg.matchCount) setMutualMatches(prev => prev.length >= (msg.matchCount ?? 0) ? prev : Array(msg.matchCount ?? 0).fill(""))
                        fetchMutualMatches()
                    } else if (msg.status === "active") {
                        setStatus("active")
                        setShowPauseOverlay(false)
                    } else if (msg.status === "finished") {
                        setStatus("finished")
                        setShowPauseOverlay(false)
                        finishAndNavigate()
                    }
                })
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
                        if (newStatus === "paused") {
                            setShowPauseOverlay(true)
                            fetchMutualMatches()
                        }
                        if (newStatus === "active") {
                            setShowPauseOverlay(false)
                        }
                        if (newStatus === "finished") {
                            setShowPauseOverlay(false)
                            finishAndNavigate()
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'participants', filter: `room_id=eq.${code}` },
                    () => fetchParticipants()
                )
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'swipes', filter: `room_id=eq.${code}` },
                    (payload) => {
                        const s = payload.new as { user_id: string; movie_id: string; direction: string }
                        if (s.user_id !== userIdRef.current && s.direction === "right") {
                            otherRightSwipesRef.current.add(s.movie_id)
                            checkNudge()
                        }
                    }
                )
                .subscribe()

            channelRef.current = roomChannel
            setIsLoading(false)

            return () => {
                supabase.removeChannel(roomChannel)
                channelRef.current = null
            }
        }

        init()
    }, [code, router, supabase, fetchParticipants, buildDeck, finishAndNavigate, checkNudge])

    const toggleReady = async () => {
        const me = participants.find(p => p.user_id === userId)
        if (!me) return
        const newReady = !me.is_ready
        trackPlayerReady(code, newReady)

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
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCountdown(null)
            return
        }

        setCountdown(3)
        const t1 = setTimeout(() => setCountdown(2), 1000)
        const t2 = setTimeout(() => setCountdown(1), 2000)
        const t3 = setTimeout(async () => {
            setCountdown(0)

            const seed = roomSeed.current
            if (seed) {
                const { data: parts } = await supabase
                    .from("participants")
                    .select("*")
                    .eq("room_id", code)
                    .order("joined_at", { ascending: true })
                if (parts) {
                    await buildDeck(parts.map(normalizeParticipant), seed)
                }
            }

            setStatus("active")
            trackSessionStart({ mode: "dual", room_code: code, movie_count: movies.length })
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
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        if (timerRef.current) clearInterval(timerRef.current)
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
        }
    }, [status])

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [])

    useEffect(() => {
        if (timeLeft === 0 && (status === "active" || status === "paused")) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setShowNudge(false)
            finishAndNavigate()
        }
    }, [timeLeft, status, finishAndNavigate])

    useEffect(() => {
        if (status !== "active" || createdBy.current !== userIdRef.current) return
        const poll = setInterval(() => { checkNudge() }, 2000)
        return () => clearInterval(poll)
    }, [status, checkNudge])

    // Safety net: sync showPauseOverlay from status changes for non-host
    useEffect(() => {
        if (createdBy.current === userIdRef.current) return // host uses NudgeOverlay, not PauseOverlay
        if (status === "paused") {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setShowPauseOverlay(true)
            fetchMutualMatches()
        } else if (status === "active") {
            setShowPauseOverlay(false)
        } else if (status === "finished") {
            setShowPauseOverlay(false)
        }
    }, [status, fetchMutualMatches])

    useEffect(() => {
        if (status === "waiting" || status === "finished") return
        if (createdBy.current === userIdRef.current) return
        const poll = setInterval(async () => {
            const { data: room } = await supabase
                .from("rooms")
                .select("status")
                .eq("id", code)
                .single()
            if (!room) return
            const dbStatus = room.status as "waiting" | "active" | "paused" | "finished"
            if (dbStatus === "finished") {
                setStatus("finished")
                finishAndNavigate()
            } else if (dbStatus !== status) {
                setStatus(dbStatus)
                if (dbStatus === "paused") {
                    setShowPauseOverlay(true)
                    fetchMutualMatches()
                } else {
                    setShowPauseOverlay(false)
                }
            }
        }, 1000)
        return () => clearInterval(poll)
    }, [status, supabase, code, finishAndNavigate, fetchMutualMatches])

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, "0")
        const s = (seconds % 60).toString().padStart(2, "0")
        return `${m}:${s}`
    }

    const handleCopy = () => {
        trackRoomCodeCopied(code)
        navigator.clipboard.writeText(code)
        setCopied(true)
        toast.success("Room Code Copied!")
        setTimeout(() => setCopied(false), 2000)
    }

    const handleSwipe = async (movieId: string, direction: "left" | "right") => {
        const currentMovie = movies.find(m => m.id === movieId)
        trackSwipe({
            direction,
            movie_id: movieId,
            movie_title: currentMovie?.title ?? "",
            position: swipedCount,
            mode: "dual",
        })
        setSwipedCount(prev => prev + 1)

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
            myRightSwipesRef.current.add(movieId)
            setMyLikedCount(prev => prev + 1)
            await checkNudge()
        }
    }

    const handleNudgeContinue = async () => {
        setShowNudge(false)
        await supabase.from("rooms").update({ status: "active" }).eq("id", code)
        channelRef.current?.send({
            type: "broadcast",
            event: "room_status",
            payload: { status: "active" },
        })
    }

    const handleNudgeCheckShortlist = async () => {
        setShowNudge(false)
        channelRef.current?.send({
            type: "broadcast",
            event: "room_status",
            payload: { status: "finished" },
        })
        await finishAndNavigate()
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
            <div className="flex flex-col items-center justify-center h-[calc(100dvh-50px)] overflow-hidden p-4 bg-black text-white dot-pattern relative">
                <div className="fixed inset-0 bg-gradient-to-b from-transparent via-black/80 to-black pointer-events-none z-0" />

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
                                    trackRoomShared(code)
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
                                                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${player1.is_ready
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
                                                    <span className={`flex h-2.5 w-2.5 rounded-full ${player1.is_ready
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
                                                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${player2.is_ready
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
                                                    <span className={`flex h-2.5 w-2.5 rounded-full ${player2.is_ready
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
                        <div className={`w-full h-16 flex items-center justify-center rounded-full text-lg font-bold uppercase tracking-wider transition-all ${countdown !== null
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

    if (status === "active" || status === "paused") {
        return (
            <div className="flex flex-col items-center justify-between h-[calc(100dvh-50px)] overflow-hidden p-4 bg-black text-white dot-pattern relative">
                <div className="fixed inset-0 bg-gradient-to-b from-transparent via-black/80 to-black pointer-events-none z-0" />

                <header className="w-full grid grid-cols-3 items-center shrink-0 mb-2 z-50 max-w-md mx-auto pt-2 relative">
                    <div />
                    <div />
                    <div className="flex justify-end">
                        <div className={`flex items-center gap-2 bg-zinc-900/80 backdrop-blur-md rounded-full px-3 py-1.5 border shadow-xl transition-colors duration-500 ${timeLeft <= 30
                            ? "border-red-600/60 shadow-[0_0_20px_-5px_rgba(220,38,38,0.4)]"
                            : "border-zinc-800"
                            }`}>
                            <Clock className={`w-4 h-4 transition-colors duration-500 ${timeLeft <= 30 ? "text-red-400" : "text-red-600"}`} />
                            <span className={`text-base font-black tracking-widest tabular-nums transition-colors duration-500 ${timeLeft <= 30 ? "text-red-400" : "text-zinc-300"
                                }`}>{formatTime(timeLeft)}</span>
                        </div>
                    </div>
                </header>

                <div className="flex-1 w-full relative z-10">
                    <div className="absolute inset-0 flex items-center justify-center py-2 pointer-events-none">
                        <div className="h-full aspect-[2/3] pointer-events-auto">
                            <SwipeDeck
                                movies={movies}
                                onSwipe={handleSwipe}
                                onEmpty={handleEmpty}
                                disabled={status === "paused"}
                                selectedOtt={selectedOtt}
                            />
                        </div>
                    </div>
                </div>

                <div className="w-full shrink-0 mt-2 mb-1 space-y-2 max-w-md mx-auto relative z-10">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                        <span>{myLikedCount} liked</span>
                        <span>{Math.max(0, movies.length - swipedCount)} of {movies.length} remaining</span>
                    </div>
                    <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                        <div
                            className="h-full bg-red-600 transition-all duration-1000 ease-linear rounded-full"
                            style={{ width: `${((180 - timeLeft) / 180) * 100}%` }}
                        />
                    </div>
                </div>

                {isHost && (
                    <NudgeOverlay
                        show={showNudge}
                        likedCount={mutualMatches.length}
                        onContinue={handleNudgeContinue}
                        onCheckShortlist={handleNudgeCheckShortlist}
                    />
                )}

                {!isHost && <PauseOverlay show={showPauseOverlay} matchCount={mutualMatches.length} />}
            </div>
        )
    }

    return null
}

