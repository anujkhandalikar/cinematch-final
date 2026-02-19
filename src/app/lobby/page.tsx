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
            <div className="flex h-screen items-center justify-center bg-black text-white">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        )
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-background dot-pattern">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="z-10 w-full max-w-md"
            >
                <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur-xl shadow-2xl">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            {mode === 'dual' ? (
                                <Button variant="ghost" size="icon" onClick={() => setMode('select')} className="-ml-2 hover:bg-zinc-800 text-zinc-400">
                                    <ArrowLeft className="w-4 h-4" />
                                </Button>
                            ) : (
                                <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="-ml-2 hover:bg-zinc-800 text-zinc-400">
                                    <ArrowLeft className="w-4 h-4" />
                                </Button>
                            )}
                            <CardTitle className="text-xl">
                                {mode === 'select' ? 'Choose Your Mode' : 'Dual Mode Lobby'}
                            </CardTitle>
                        </div>
                        <CardDescription className="text-zinc-400">
                            {mode === 'select'
                                ? 'Watch alone or sync with a partner'
                                : 'Start a new session or join a friend'}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        <AnimatePresence mode="wait">
                            {mode === 'select' ? (
                                <motion.div
                                    key="select"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="grid gap-4"
                                >
                                    <Button
                                        variant="outline"
                                        className="h-24 justify-start px-6 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600 transition-all group"
                                        onClick={handleSoloMode}
                                        disabled={isCreating}
                                    >
                                        <div className="bg-indigo-500/10 p-3 rounded-full mr-4 group-hover:bg-indigo-500/20 transition-colors">
                                            <Play className="w-6 h-6 text-indigo-500" />
                                        </div>
                                        <div className="text-left">
                                            <div className="font-semibold text-lg text-foreground">Solo Mode</div>
                                            <div className="text-sm text-muted-foreground">Quick 3-minute swipe session alone</div>
                                        </div>
                                    </Button>

                                    <Button
                                        variant="outline"
                                        className="h-24 justify-start px-6 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600 transition-all group"
                                        onClick={() => setMode('dual')}
                                    >
                                        <div className="bg-pink-500/10 p-3 rounded-full mr-4 group-hover:bg-pink-500/20 transition-colors">
                                            <Users className="w-6 h-6 text-pink-500" />
                                        </div>
                                        <div className="text-left">
                                            <div className="font-semibold text-lg text-foreground">Dual Mode</div>
                                            <div className="text-sm text-muted-foreground">Sync with a partner and match</div>
                                        </div>
                                    </Button>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="dual"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="space-y-6"
                                >
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-medium text-zinc-300">Start New Session</h3>
                                        <Button
                                            className="w-full h-12 text-lg gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 border-0"
                                            onClick={handleCreateRoom}
                                            disabled={isCreating}
                                        >
                                            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                            {isCreating ? "Creating..." : "Create Room"}
                                        </Button>
                                    </div>

                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <span className="w-full border-t border-zinc-800" />
                                        </div>
                                        <div className="relative flex justify-center text-xs uppercase">
                                            <span className="bg-zinc-900 px-2 text-zinc-500">Or join existing</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="ROOM CODE"
                                                value={joinCode}
                                                onChange={(e) => setJoinCode(e.target.value)}
                                                className="uppercase tracking-widest text-center h-12 text-lg font-mono border-zinc-700 bg-zinc-800/50 focus:ring-purple-500"
                                                maxLength={4}
                                            />
                                            <Button
                                                onClick={handleJoinRoom}
                                                variant="secondary"
                                                className="h-12 w-24 bg-white text-black hover:bg-zinc-200"
                                            >
                                                Join
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    )
}
