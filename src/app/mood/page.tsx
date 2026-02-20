"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Trophy, PartyPopper, Clapperboard, Award, Star, Check, SkipForward, Tv } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { getAvailableProviders, type Mood } from "@/lib/movies"

const MOODS: { id: Mood; label: string; description: string; icon: React.ReactNode; gradient: string }[] = [
    {
        id: "imdb_top",
        label: "IMDb Rated Top",
        description: "The greatest films ever made",
        icon: <Trophy className="w-7 h-7" />,
        gradient: "from-amber-500/20 to-yellow-600/5"
    },
    {
        id: "light_and_fun",
        label: "Something Light & Fun",
        description: "Feel-good, easy watches",
        icon: <PartyPopper className="w-7 h-7" />,
        gradient: "from-pink-500/20 to-purple-600/5"
    },
    {
        id: "bollywood",
        label: "Bollywood",
        description: "The best of Indian cinema",
        icon: <Clapperboard className="w-7 h-7" />,
        gradient: "from-emerald-500/20 to-teal-600/5"
    },
    {
        id: "oscar",
        label: "Oscar Winners",
        description: "Academy Award Best Picture winners",
        icon: <Award className="w-7 h-7" />,
        gradient: "from-yellow-500/20 to-amber-600/5"
    },
    {
        id: "srk",
        label: "Shah Rukh Khan",
        description: "King Khan's finest films",
        icon: <Star className="w-7 h-7" />,
        gradient: "from-orange-500/20 to-red-600/5"
    }
]

// OTT provider brand colors
const PROVIDER_COLORS: Record<string, string> = {
    Netflix: "from-red-600/25 to-red-900/10",
    "Amazon Prime Video": "from-sky-500/25 to-blue-900/10",
    Zee5: "from-violet-500/25 to-violet-900/10",
    MUBI: "from-blue-400/25 to-blue-900/10",
    "Lionsgate Play": "from-amber-500/25 to-amber-900/10",
}

export default function MoodPage() {
    const router = useRouter()
    const [selectedMood, setSelectedMood] = useState<Mood | null>(null)
    const [availableProviders, setAvailableProviders] = useState<string[]>([])
    const [selectedProviders, setSelectedProviders] = useState<string[]>([])
    const [loadingProviders, setLoadingProviders] = useState(false)

    // Fetch OTT providers when a mood is selected
    useEffect(() => {
        if (!selectedMood) return

        setLoadingProviders(true)
        setSelectedProviders([])
        getAvailableProviders(selectedMood).then((providers) => {
            setAvailableProviders(providers)
            setLoadingProviders(false)
        })
    }, [selectedMood])

    const handleMoodSelect = (mood: Mood) => {
        if (selectedMood === mood) {
            // Deselect
            setSelectedMood(null)
            setAvailableProviders([])
            setSelectedProviders([])
            return
        }
        setSelectedMood(mood)
        sessionStorage.setItem("selected_mood", mood)
    }

    const toggleProvider = (provider: string) => {
        setSelectedProviders((prev) =>
            prev.includes(provider)
                ? prev.filter((p) => p !== provider)
                : [...prev, provider]
        )
    }

    const handleContinue = () => {
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

    return (
        <div className="flex min-h-screen items-start justify-center pt-8 p-4 bg-black text-white dot-pattern relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/80 to-black pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="z-10 w-full max-w-md md:max-w-5xl relative"
            >
                {/* Header Badge */}
                <div className="flex justify-center mb-4">
                    <span className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900/80 px-4 py-1.5 text-xs font-medium text-zinc-400 uppercase tracking-widest backdrop-blur-sm">
                        <span className="flex h-2 w-2 rounded-full bg-red-600 mr-2 animate-pulse"></span>
                        Set The Vibe
                    </span>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-xl rounded-2xl p-8 shadow-2xl">
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={() => router.push("/lobby")} className="rounded-full w-10 h-10 hover:bg-zinc-800 text-zinc-400 hover:text-white">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <div className="space-y-1">
                                <h1 className="text-2xl font-black uppercase tracking-tighter text-white">
                                    Mood
                                </h1>
                                <p className="text-xs font-bold tracking-widest text-zinc-500 uppercase">
                                    What are you feeling?
                                </p>
                            </div>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="grid gap-4 pt-4 md:grid-cols-5"
                        >
                            {MOODS.map((mood, i) => {
                                const isSelected = selectedMood === mood.id
                                return (
                                    <motion.button
                                        key={mood.id}
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.15 + i * 0.08 }}
                                        className={`group relative flex items-center md:flex-col md:justify-center md:py-12 md:px-4 md:aspect-[3/4] p-6 rounded-xl bg-gradient-to-r md:bg-gradient-to-b ${mood.gradient} border transition-all duration-300 text-left md:text-center w-full overflow-hidden ${isSelected
                                                ? "border-red-500/60 ring-1 ring-red-500/30 scale-[1.02]"
                                                : selectedMood && !isSelected
                                                    ? "border-zinc-800/40 opacity-50"
                                                    : "border-zinc-800 hover:border-zinc-600 hover:scale-[1.02]"
                                            }`}
                                        onClick={() => handleMoodSelect(mood.id)}
                                    >
                                        {/* Subtle glow on hover */}
                                        <div className="absolute inset-0 bg-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                        {/* Selection checkmark */}
                                        {isSelected && (
                                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-600 flex items-center justify-center">
                                                <Check className="w-3.5 h-3.5 text-white" />
                                            </div>
                                        )}

                                        <div className="relative mr-5 md:mr-0 md:mb-3 p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 group-hover:border-zinc-700 transition-colors text-zinc-400 group-hover:text-white">
                                            {mood.icon}
                                        </div>
                                        <div className="relative">
                                            <h3 className={`font-black text-lg md:text-sm uppercase tracking-wide mb-1 md:mb-0 transition-colors ${isSelected ? "text-red-500" : "text-white group-hover:text-red-500"
                                                }`}>
                                                {mood.label}
                                            </h3>
                                            <p className="text-zinc-500 text-sm font-medium md:hidden">
                                                {mood.description}
                                            </p>
                                        </div>
                                    </motion.button>
                                )
                            })}
                        </motion.div>

                        {/* OTT Filter Section — appears after mood selection */}
                        <AnimatePresence>
                            {selectedMood && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                    className="overflow-hidden"
                                >
                                    <div className="border-t border-zinc-800/60 pt-6 space-y-4">
                                        <div className="flex items-center gap-3">
                                            <Tv className="w-5 h-5 text-zinc-500" />
                                            <div>
                                                <h2 className="text-sm font-black uppercase tracking-wider text-white">
                                                    Where do you watch?
                                                </h2>
                                                <p className="text-[11px] font-bold tracking-widest text-zinc-600 uppercase">
                                                    Optional — filter by platform
                                                </p>
                                            </div>
                                        </div>

                                        {loadingProviders ? (
                                            <div className="flex justify-center py-6">
                                                <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                            </div>
                                        ) : availableProviders.length === 0 ? (
                                            <p className="text-zinc-600 text-xs text-center py-4">
                                                No streaming data for this mood yet
                                            </p>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {availableProviders.map((provider) => {
                                                    const isSelected = selectedProviders.includes(provider)
                                                    const gradient = PROVIDER_COLORS[provider] ?? "from-zinc-500/20 to-zinc-900/5"

                                                    return (
                                                        <motion.button
                                                            key={provider}
                                                            initial={{ opacity: 0, scale: 0.9 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            className={`group relative flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r ${gradient} border transition-all duration-200 ${isSelected
                                                                    ? "border-red-500/60 ring-1 ring-red-500/30"
                                                                    : "border-zinc-800 hover:border-zinc-600"
                                                                }`}
                                                            onClick={() => toggleProvider(provider)}
                                                        >
                                                            <div className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 ${isSelected
                                                                    ? "bg-red-600 border-red-600"
                                                                    : "border-zinc-600 group-hover:border-zinc-400"
                                                                }`}>
                                                                {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                                                            </div>
                                                            <span className={`font-bold text-xs uppercase tracking-wide transition-colors ${isSelected ? "text-white" : "text-zinc-400 group-hover:text-white"
                                                                }`}>
                                                                {provider}
                                                            </span>
                                                        </motion.button>
                                                    )
                                                })}
                                            </div>
                                        )}

                                        {/* Action buttons */}
                                        <div className="flex gap-3 pt-2">
                                            <Button
                                                className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wider rounded-full transition-all shadow-lg shadow-red-600/20 hover:shadow-red-600/40"
                                                onClick={selectedProviders.length > 0 ? handleContinue : handleSkip}
                                            >
                                                {selectedProviders.length > 0 ? (
                                                    <>
                                                        <Check className="w-4 h-4 mr-2" />
                                                        Continue ({selectedProviders.length} selected)
                                                    </>
                                                ) : (
                                                    <>
                                                        <SkipForward className="w-4 h-4 mr-2" />
                                                        Continue — All Platforms
                                                    </>
                                                )}
                                            </Button>
                                        </div>
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
