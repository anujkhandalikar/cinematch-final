"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Users, Play, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import { trackModeSelected, trackNavBack } from "@/lib/analytics"

export default function LobbyPage() {
    const router = useRouter()
    const [isNavigating, setIsNavigating] = useState(false)

    const handleModeSelect = (mode: "solo" | "dual") => {
        setIsNavigating(true)
        trackModeSelected(mode)
        sessionStorage.setItem("selected_mode", mode)
        router.push("/mood")
    }

    return (
        <div className="flex min-h-screen items-start justify-center pt-8 p-4 bg-black text-white dot-pattern relative">
            <div className="fixed inset-0 bg-gradient-to-b from-transparent via-black/80 to-black pointer-events-none z-0" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="z-10 w-full max-w-md relative"
            >
                {/* Header Badge */}
                <div className="flex justify-center mb-8">
                    <span className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900/80 px-4 py-1.5 text-xs font-medium text-zinc-400 uppercase tracking-widest backdrop-blur-sm">
                        <Play className="w-3 h-3 text-red-600 mr-2" />
                        Choose Your Mode
                    </span>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-xl rounded-2xl p-8 shadow-2xl">
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={() => { trackNavBack("lobby"); router.push("/"); }} className="rounded-full w-10 h-10 hover:bg-zinc-800 text-zinc-400 hover:text-white">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <div className="space-y-1">
                                <h1 className="text-2xl font-black uppercase tracking-tighter text-white">
                                    Mode
                                </h1>
                                <p className="text-xs font-bold tracking-widest text-zinc-500 uppercase">
                                    Solo or Duo?
                                </p>
                            </div>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="grid gap-4 pt-4"
                        >
                            <button
                                className="group relative flex items-center p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/80 transition-all duration-300 text-left w-full"
                                onClick={() => handleModeSelect("solo")}
                                disabled={isNavigating}
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
                                onClick={() => handleModeSelect("dual")}
                                disabled={isNavigating}
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
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
