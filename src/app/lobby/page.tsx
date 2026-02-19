"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowLeft, Users, Zap, Play, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"

export default function LobbyPage() {
    const router = useRouter()
    const [joinCode, setJoinCode] = useState("")
    const [isCreating, setIsCreating] = useState(false)
    const [isCheckingAuth, setIsCheckingAuth] = useState(true)
    const [mode, setMode] = useState<'select' | 'dual'>('select')
    const supabase = createClient()

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
        return Math.random().toString(36).substring(2, 6).toUpperCase() // 4 chars
    }

    const handleCreateRoom = async () => {
        setIsCreating(true)
        const code = generateCode()

        // Get current user (guaranteed by useEffect)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            toast.error("Authentication error")
            setIsCreating(false)
            return
        }

        // Create room in Supabase
        const { error } = await supabase
            .from('rooms')
            .insert({
                id: code,
                created_by: user.id,
                status: 'waiting',
                mode: 'dual'
            })

        if (error) {
            console.error(error)
            toast.error("Failed to create room. Try again.")
            setIsCreating(false)
            return
        }

        // Also add creator as a participant
        const { error: participantError } = await supabase
            .from('participants')
            .insert({
                room_id: code,
                user_id: user.id,
                is_ready: true // Creator is arguably ready or will be in the room
            })

        if (participantError) {
            console.error("Participant error:", participantError)
            // Non-blocking, but good to know
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

        // Validate room exists
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

        // Join as participant
        const { error: joinError } = await supabase
            .from('participants')
            .insert({
                room_id: room.id,
                user_id: user.id,
                is_ready: false
            })

        // Ignore duplicate key error (if re-joining)
        if (joinError && joinError.code !== '23505') {
            console.error(joinError)
            toast.error("Failed to join room")
            return
        }

        router.push(`/room/${room.id}`)
    }

    const handleSoloMode = async () => {
        // Could create a 'solo' room implicitly or just route to a solo page
        // For consistent architecture, let's create a solo room
        setIsCreating(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const code = generateCode()
        const { error } = await supabase.from('rooms').insert({
            id: code,
            created_by: user.id,
            status: 'active', // Solo starts immediately
            mode: 'solo'
        })

        if (error) {
            toast.error("Failed to start solo session")
            setIsCreating(false)
            return
        }

        router.push(`/room/${code}`)
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
                {/* Header that mimics Landing Page badges */}
                <div className="flex justify-center mb-8">
                    <span className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900/80 px-4 py-1.5 text-xs font-medium text-zinc-400 uppercase tracking-widest backdrop-blur-sm">
                        <Users className="w-3 h-3 text-red-600 mr-2" />
                        Lobby
                    </span>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-xl rounded-2xl p-8 shadow-2xl">
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            {mode === 'dual' ? (
                                <Button variant="ghost" size="icon" onClick={() => setMode('select')} className="rounded-full w-10 h-10 hover:bg-zinc-800 text-zinc-400 hover:text-white">
                                    <ArrowLeft className="w-5 h-5" />
                                </Button>
                            ) : (
                                <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="rounded-full w-10 h-10 hover:bg-zinc-800 text-zinc-400 hover:text-white">
                                    <ArrowLeft className="w-5 h-5" />
                                </Button>
                            )}
                            <div className="space-y-1">
                                <h1 className="text-2xl font-black uppercase tracking-tighter text-white">
                                    {mode === 'select' ? 'Choose Mode' : 'Dual Mode'}
                                </h1>
                                <p className="text-xs font-bold tracking-widest text-zinc-500 uppercase">
                                    {mode === 'select'
                                        ? 'Solo or Duo?'
                                        : 'Sync with a partner'}
                                </p>
                            </div>
                        </div>

                        <AnimatePresence mode="wait">
                            {mode === 'select' ? (
                                <motion.div
                                    key="select"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="grid gap-4 pt-4"
                                >
                                    <button
                                        className="group relative flex items-center p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/80 transition-all duration-300 text-left w-full"
                                        onClick={handleSoloMode}
                                        disabled={isCreating}
                                    >
                                        <div className="mr-6 p-4 rounded-full bg-zinc-950 border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                                            <Play className="w-6 h-6 text-red-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-lg uppercase tracking-wide text-white mb-1 group-hover:text-red-500 transition-colors">Solo Mode</h3>
                                            <p className="text-zinc-500 text-sm font-medium">Quick 3-minute swipe session alone.</p>
                                        </div>
                                    </button>

                                    <button
                                        className="group relative flex items-center p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/80 transition-all duration-300 text-left w-full"
                                        onClick={() => setMode('dual')}
                                    >
                                        <div className="mr-6 p-4 rounded-full bg-zinc-950 border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                                            <Users className="w-6 h-6 text-zinc-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-lg uppercase tracking-wide text-white mb-1 group-hover:text-zinc-300 transition-colors">Dual Mode</h3>
                                            <p className="text-zinc-500 text-sm font-medium">Link up and find a match together.</p>
                                        </div>
                                    </button>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="dual"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
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
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
