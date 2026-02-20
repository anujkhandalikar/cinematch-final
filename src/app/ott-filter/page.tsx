"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Check, Tv, SkipForward } from "lucide-react"
import { motion } from "framer-motion"
import { getAvailableProviders, type Mood } from "@/lib/movies"

// OTT provider config with brand colors
const PROVIDER_CONFIG: Record<string, { color: string; gradient: string }> = {
    Netflix: {
        color: "#E50914",
        gradient: "from-red-600/25 to-red-900/10",
    },
    "Amazon Prime Video": {
        color: "#00A8E1",
        gradient: "from-sky-500/25 to-blue-900/10",
    },
    "Disney+ Hotstar": {
        color: "#1A73E8",
        gradient: "from-blue-500/25 to-indigo-900/10",
    },
    JioCinema: {
        color: "#E91E63",
        gradient: "from-pink-500/25 to-pink-900/10",
    },
    Zee5: {
        color: "#8B5CF6",
        gradient: "from-violet-500/25 to-violet-900/10",
    },
    SonyLIV: {
        color: "#000000",
        gradient: "from-zinc-500/25 to-zinc-900/10",
    },
    "Apple TV+": {
        color: "#555555",
        gradient: "from-gray-400/25 to-gray-900/10",
    },
    MUBI: {
        color: "#0080FF",
        gradient: "from-blue-400/25 to-blue-900/10",
    },
    "Lionsgate Play": {
        color: "#F5A623",
        gradient: "from-amber-500/25 to-amber-900/10",
    },
}

const DEFAULT_CONFIG = {
    color: "#71717a",
    gradient: "from-zinc-500/20 to-zinc-900/5",
}

export default function OTTFilterPage() {
    const router = useRouter()
    const [availableProviders, setAvailableProviders] = useState<string[]>([])
    const [selectedProviders, setSelectedProviders] = useState<string[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const mood = sessionStorage.getItem("selected_mood") as Mood | null
        if (!mood) {
            router.push("/mood")
            return
        }

        getAvailableProviders(mood).then((providers) => {
            setAvailableProviders(providers)
            setLoading(false)
        })
    }, [router])

    const toggleProvider = (provider: string) => {
        setSelectedProviders((prev) =>
            prev.includes(provider)
                ? prev.filter((p) => p !== provider)
                : [...prev, provider]
        )
    }

    const handleContinue = () => {
        // Store selected providers in sessionStorage
        if (selectedProviders.length > 0) {
            sessionStorage.setItem("selected_ott", JSON.stringify(selectedProviders))
        } else {
            sessionStorage.removeItem("selected_ott")
        }

        const mode = sessionStorage.getItem("selected_mode")
        if (mode === "dual") {
            router.push("/lobby/dual")
        } else {
            router.push("/solo")
        }
    }

    const handleSkip = () => {
        sessionStorage.removeItem("selected_ott")
        const mode = sessionStorage.getItem("selected_mode")
        if (mode === "dual") {
            router.push("/lobby/dual")
        } else {
            router.push("/solo")
        }
    }

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-black text-white dot-pattern">
                <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="flex min-h-screen items-start justify-center pt-8 p-4 bg-black text-white dot-pattern relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/80 to-black pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="z-10 w-full max-w-md md:max-w-2xl relative"
            >
                {/* Header Badge */}
                <div className="flex justify-center mb-4">
                    <span className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900/80 px-4 py-1.5 text-xs font-medium text-zinc-400 uppercase tracking-widest backdrop-blur-sm">
                        <span className="flex h-2 w-2 rounded-full bg-red-600 mr-2 animate-pulse"></span>
                        Filter By Platform
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
                                    Where do you watch?
                                </h1>
                                <p className="text-xs font-bold tracking-widest text-zinc-500 uppercase">
                                    Select your streaming platforms — or skip to see all
                                </p>
                            </div>
                        </div>

                        {availableProviders.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-12"
                            >
                                <Tv className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                                <p className="text-zinc-500 text-sm">
                                    No streaming data available for this mood yet.
                                </p>
                                <Button
                                    className="mt-6 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wider rounded-full px-8 h-12"
                                    onClick={handleSkip}
                                >
                                    Continue Anyway
                                </Button>
                            </motion.div>
                        ) : (
                            <>
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2"
                                >
                                    {availableProviders.map((provider, i) => {
                                        const config = PROVIDER_CONFIG[provider] ?? DEFAULT_CONFIG
                                        const isSelected = selectedProviders.includes(provider)

                                        return (
                                            <motion.button
                                                key={provider}
                                                initial={{ opacity: 0, y: 15 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.1 + i * 0.05 }}
                                                className={`group relative flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r ${config.gradient} border transition-all duration-300 text-left w-full overflow-hidden ${isSelected
                                                        ? "border-red-500/60 ring-1 ring-red-500/30 scale-[1.02]"
                                                        : "border-zinc-800 hover:border-zinc-600 hover:scale-[1.01]"
                                                    }`}
                                                onClick={() => toggleProvider(provider)}
                                            >
                                                {/* Checkmark */}
                                                <div className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${isSelected
                                                        ? "bg-red-600 border-red-600"
                                                        : "border-zinc-600 group-hover:border-zinc-400"
                                                    }`}>
                                                    {isSelected && <Check className="w-4 h-4 text-white" />}
                                                </div>

                                                <span className={`font-bold text-sm uppercase tracking-wide transition-colors ${isSelected ? "text-white" : "text-zinc-400 group-hover:text-white"
                                                    }`}>
                                                    {provider}
                                                </span>

                                                {/* Subtle glow on hover */}
                                                <div className="absolute inset-0 bg-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                            </motion.button>
                                        )
                                    })}
                                </motion.div>

                                {/* Action buttons */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="flex flex-col sm:flex-row gap-3 pt-4"
                                >
                                    <Button
                                        className="flex-1 h-14 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wider rounded-full transition-all shadow-lg shadow-red-600/20 hover:shadow-red-600/40 disabled:opacity-40 disabled:cursor-not-allowed"
                                        onClick={handleContinue}
                                        disabled={selectedProviders.length === 0}
                                    >
                                        <Check className="w-5 h-5 mr-2" />
                                        Apply Filter ({selectedProviders.length})
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="flex-1 h-14 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-bold uppercase tracking-wider rounded-full transition-all"
                                        onClick={handleSkip}
                                    >
                                        <SkipForward className="w-5 h-5 mr-2" />
                                        Skip — Show All
                                    </Button>
                                </motion.div>
                            </>
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
