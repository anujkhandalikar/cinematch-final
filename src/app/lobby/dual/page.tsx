"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Users, Zap, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { motion } from "framer-motion"

export default function DualLobbyPage() {
    const router = useRouter()
    const [joinCode, setJoinCode] = useState("")
    const [isCreating, setIsCreating] = useState(false)
    const [isCheckingAuth, setIsCheckingAuth] = useState(true)
    const supabase = useMemo(() => createClient(), [])

    useEffect(() => {
        const ensureAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                const { error } = await supabase.auth.signInAnonymously()
                if (error) {
                    toast.error("Failed to authenticate")
                    return
                }
            }
            setIsCheckingAuth(false)
        }
        ensureAuth()
    }, [supabase])

    const generateCode = () => {
        return Math.random().toString(36).substring(2, 6).toUpperCase()
    }

    const handleCreateRoom = async () => {
        setIsCreating(true)
        const code = generateCode()
        const seed = crypto.randomUUID()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            toast.error("Authentication error")
            setIsCreating(false)
            return
        }

        const { error } = await supabase
            .from('rooms')
            .insert({
                id: code,
                created_by: user.id,
                status: 'waiting',
                mode: 'dual',
                seed
            })

        if (error) {
            console.error(error)
            toast.error("Failed to create room. Try again.")
            setIsCreating(false)
            return
        }

        const mood = sessionStorage.getItem("selected_mood") || null

        const { error: participantError } = await supabase.from('participants').insert({
            room_id: code,
            user_id: user.id,
            is_ready: false,
            ...(mood ? { mood } : {})
        })

        if (participantError) {
            console.error("Participant error:", participantError)
        }

        toast.success("Room created!")
        router.push(`/room/${code}`)
    }

    const handleJoinRoom = async () => {
        if (joinCode.length < 4) {
            toast.error("Invalid room code")
            return
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            toast.error("Authentication missing")
            return
        }

        const { data: room, error } = await supabase
            .from('rooms')
            .select('id, status')
            .eq('id', joinCode.toUpperCase())
            .single()

        if (error || !room) {
            toast.error("Room not found")
            return
        }

        if (room.status !== 'waiting') {
            toast.error("Room is already active or finished")
            return
        }

        const mood = sessionStorage.getItem("selected_mood") || null

        const { error: joinError } = await supabase.from('participants').insert({
            room_id: room.id,
            user_id: user.id,
            is_ready: false,
            ...(mood ? { mood } : {})
        })

        if (joinError && joinError.code !== '23505') {
            console.error(joinError)
            toast.error("Failed to join room")
            return
        }

        router.push(`/room/${room.id}`)
    }

    if (isCheckingAuth) {
        return (
            <div className="flex h-screen items-center justify-center bg-black text-white dot-pattern">
                <Loader2 className="h-8 w-8 animate-spin text-red-600" />
            </div>
        )
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-black text-white dot-pattern relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/80 to-black pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="z-10 w-full max-w-md relative"
            >
                {/* Header Badge */}
                <div className="flex justify-center mb-8">
                    <span className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900/80 px-4 py-1.5 text-xs font-medium text-zinc-400 uppercase tracking-widest backdrop-blur-sm">
                        <Users className="w-3 h-3 text-red-600 mr-2" />
                        Dual Mode
                    </span>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-xl rounded-2xl p-8 shadow-2xl">
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={() => router.push("/mood")} className="rounded-full w-10 h-10 hover:bg-zinc-800 text-zinc-400 hover:text-white">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <div className="space-y-1">
                                <h1 className="text-2xl font-black uppercase tracking-tighter text-white">
                                    Dual Mode
                                </h1>
                                <p className="text-xs font-bold tracking-widest text-zinc-500 uppercase">
                                    Sync with a partner
                                </p>
                            </div>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-8 pt-4"
                        >
                            <div className="space-y-4">
                                <Button
                                    className="w-full h-16 text-lg bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wider rounded-full shadow-[0_0_30px_-10px_rgba(220,38,38,0.5)] transition-all hover:scale-[1.02]"
                                    onClick={handleCreateRoom}
                                    disabled={isCreating}
                                >
                                    {isCreating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Zap className="w-5 h-5 mr-2" />}
                                    {isCreating ? "Creating..." : "Create Room"}
                                </Button>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-zinc-800" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold">
                                    <span className="bg-zinc-950/0 px-2 text-zinc-600 backdrop-blur-xl">Or join existing</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <Input
                                        placeholder="ROOM CODE"
                                        value={joinCode}
                                        onChange={(e) => setJoinCode(e.target.value)}
                                        className="uppercase tracking-[0.2em] text-center h-14 text-xl font-black border-zinc-800 bg-zinc-900/50 focus:ring-red-600 focus:border-red-600 rounded-xl"
                                        maxLength={4}
                                    />
                                </div>
                                <Button
                                    onClick={handleJoinRoom}
                                    variant="outline"
                                    className="w-full h-14 border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-900 hover:text-white font-bold text-base uppercase tracking-wider rounded-full"
                                >
                                    Join Room
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
