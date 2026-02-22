"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Trophy, PartyPopper, Clapperboard, Award, Star, Check, SkipForward, Tv, Flame, Zap, Timer, Users, TrendingUp, Shuffle, ArrowRight, Sparkles } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { getAvailableProviders, type Mood } from "@/lib/movies"
import { trackMoodSelected, trackOttToggled, trackOttSelected, trackOttSkipped, trackNavBack } from "@/lib/analytics"

const NOISE_TEXTURE = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

const MOODS: { id: Mood; label: string; description: string; icon: React.ReactNode; gradient: string }[] = [
    {
        id: "imdb_top",
        label: "IMDb Rated Top",
        description: "The greatest films ever made",
        icon: <Trophy className="w-7 h-7" />,
        gradient: "from-amber-500/60 via-amber-900/30 to-transparent",
    },
    {
        id: "light_and_fun",
        label: "Something Light & Fun",
        description: "Feel-good, easy watches",
        icon: <PartyPopper className="w-7 h-7" />,
        gradient: "from-pink-500/60 via-pink-900/30 to-transparent",
    },
    {
        id: "bollywood",
        label: "Bollywood",
        description: "The best of Indian cinema",
        icon: <Clapperboard className="w-7 h-7" />,
        gradient: "from-orange-500/65 via-rose-900/35 to-transparent",
    },
    {
        id: "oscar",
        label: "Oscar Winners",
        description: "Academy Award Best Picture winners",
        icon: <Award className="w-7 h-7" />,
        gradient: "from-yellow-400/55 via-yellow-900/30 to-transparent",
    },
    {
        id: "srk",
        label: "Shah Rukh Khan",
        description: "King Khan's finest films",
        icon: <Star className="w-7 h-7" />,
        gradient: "from-red-500/60 via-red-900/30 to-transparent",
    },
    {
        id: "latest",
        label: "Latest",
        description: "Fresh drops and new releases",
        icon: <Flame className="w-7 h-7" />,
        gradient: "from-rose-600/60 via-rose-950/30 to-transparent",
    },
    {
        id: "gritty_thrillers",
        label: "Gritty Thrillers",
        description: "Dark, edge-of-your-seat suspense",
        icon: <Zap className="w-7 h-7" />,
        gradient: "from-indigo-500/55 via-indigo-950/30 to-transparent",
    },
    {
        id: "quick_watches",
        label: "Quick Watches",
        description: "Movies under 100 minutes",
        icon: <Timer className="w-7 h-7" />,
        gradient: "from-sky-500/55 via-sky-900/25 to-transparent",
    },
    {
        id: "reality_and_drama",
        label: "Reality & Drama",
        description: "Bingeable unscripted chaos",
        icon: <Users className="w-7 h-7" />,
        gradient: "from-fuchsia-500/60 via-fuchsia-900/30 to-transparent",
    },
    {
        id: "whats_viral",
        label: "What's Viral",
        description: "The shows everyone is talking about",
        icon: <TrendingUp className="w-7 h-7" />,
        gradient: "from-emerald-500/60 via-emerald-900/30 to-transparent",
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
    const [displayedMoods, setDisplayedMoods] = useState<typeof MOODS>([])
    const [cardsVisible, setCardsVisible] = useState(true)
    const [aiInput, setAiInput] = useState("")
    const [aiQuery, setAiQuery] = useState("")

    // Initialize with the requested default moods
    useEffect(() => {
        const defaultMoodIds = ["light_and_fun", "latest", "imdb_top"]
        const initialMoods = MOODS.filter(m => defaultMoodIds.includes(m.id))
        setDisplayedMoods(initialMoods)
    }, [])

    // Shuffle exactly 3 cards
    const handleShuffle = () => {
        setCardsVisible(false)
        setTimeout(() => {
            const currentIds = displayedMoods.map(m => m.id)
            const availableMoods = MOODS.filter(m => !currentIds.includes(m.id))
            const shuffled = [...availableMoods].sort(() => 0.5 - Math.random())
            setDisplayedMoods(shuffled.slice(0, 3))
            setCardsVisible(true)
        }, 200)
    }

    // Fetch OTT providers when a mood or AI query is active
    useEffect(() => {
        if (!selectedMood && !aiQuery) return
        setLoadingProviders(true)
        setSelectedProviders([])
        // For AI mode pass no mood to get all providers; for mood mode pass the mood
        getAvailableProviders(selectedMood ?? undefined).then((providers) => {
            setAvailableProviders(providers)
            setLoadingProviders(false)
        })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedMood, aiQuery])

    const handleMoodSelect = (mood: Mood) => {
        // Clear AI query when a mood pill is picked
        setAiInput("")
        setAiQuery("")
        if (selectedMood === mood) {
            setSelectedMood(null)
            setAvailableProviders([])
            setSelectedProviders([])
            return
        }
        setSelectedMood(mood)
        trackMoodSelected(mood)
        sessionStorage.setItem("selected_mood", mood)
    }

    const handleAiSubmit = () => {
        const trimmed = aiInput.trim()
        if (!trimmed) return
        console.log("[ai-search] submit query:", trimmed)
        // Clear mood selection when AI query is submitted
        setSelectedMood(null)
        setAiQuery(trimmed)
    }

    const toggleProvider = (provider: string) => {
        const willBeSelected = !selectedProviders.includes(provider)
        trackOttToggled(provider, willBeSelected)
        setSelectedProviders((prev) =>
            prev.includes(provider)
                ? prev.filter((p) => p !== provider)
                : [...prev, provider]
        )
    }

    const handleContinue = () => {
        if (selectedProviders.length > 0) {
            trackOttSelected(selectedProviders)
            sessionStorage.setItem("selected_ott", JSON.stringify(selectedProviders))
        } else {
            trackOttSkipped()
            sessionStorage.removeItem("selected_ott")
        }

        if (aiQuery) {
            sessionStorage.setItem("ai_search_query", aiQuery)
            sessionStorage.removeItem("selected_mood")
            router.push("/solo")
            return
        }

        const mode = sessionStorage.getItem("selected_mode")
        if (mode === "dual") {
            router.push("/lobby/dual")
        } else {
            router.push("/solo")
        }
    }

    const handleSkip = () => {
        trackOttSkipped()
        sessionStorage.removeItem("selected_ott")

        if (aiQuery) {
            sessionStorage.setItem("ai_search_query", aiQuery)
            sessionStorage.removeItem("selected_mood")
            router.push("/solo")
            return
        }

        const mode = sessionStorage.getItem("selected_mode")
        if (mode === "dual") {
            router.push("/lobby/dual")
        } else {
            router.push("/solo")
        }
    }

    const renderOttFilterContent = (isMobile: boolean) => (
        <div className={`space-y-4 ${isMobile ? "" : "border-t border-zinc-800/60 pt-6"}`}>
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
                <div className={`flex gap-2 ${isMobile ? "overflow-x-auto pb-2 -mx-4 px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" : "flex-wrap"}`}>
                    {availableProviders.map((provider) => {
                        const isSelected = selectedProviders.includes(provider)
                        const gradient = PROVIDER_COLORS[provider] ?? "from-zinc-500/20 to-zinc-900/5"

                        return (
                            <motion.button
                                key={provider}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`group relative flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r ${gradient} border transition-all duration-200 flex-shrink-0 whitespace-nowrap ${isSelected
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
                    className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white font-black italic uppercase tracking-tighter rounded-full transition-all shadow-[0_0_30px_-10px_rgba(220,38,38,0.5)] hover:scale-105"
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
    )

    return (
        <div className="flex min-h-screen items-start justify-center pt-8 px-4 pb-32 md:pb-8 bg-black text-white dot-pattern relative">
            <div className="fixed inset-0 bg-gradient-to-b from-transparent via-black/80 to-black pointer-events-none z-0" />

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
                            <Button variant="ghost" size="icon" onClick={() => { trackNavBack("mood"); router.push("/lobby"); }} className="rounded-full w-10 h-10 hover:bg-zinc-800 text-zinc-400 hover:text-white">
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

                        {/* AI Natural Language Search */}
                        <div className="relative">
                            <div className={`flex items-center gap-2 rounded-xl border bg-zinc-950/60 px-4 py-3 transition-all duration-200 ${aiQuery ? "border-red-500/50 ring-1 ring-red-500/20" : "border-zinc-800 focus-within:border-zinc-600"}`}>
                                <Sparkles className={`w-4 h-4 shrink-0 transition-colors ${aiQuery ? "text-red-400" : "text-zinc-500"}`} />
                                <input
                                    type="text"
                                    value={aiInput}
                                    onChange={(e) => {
                                        setAiInput(e.target.value)
                                        if (aiQuery) setAiQuery("")
                                    }}
                                    onKeyDown={(e) => e.key === "Enter" && handleAiSubmit()}
                                    placeholder='Try: "top thriller from the 90s" or "feel-good Bollywood"'
                                    className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 outline-none min-w-0"
                                />
                                {aiInput.trim() && (
                                    <button
                                        onClick={handleAiSubmit}
                                        className="shrink-0 w-7 h-7 rounded-lg bg-red-600 hover:bg-red-500 flex items-center justify-center transition-colors"
                                    >
                                        <ArrowRight className="w-3.5 h-3.5 text-white" />
                                    </button>
                                )}
                            </div>
                            {aiQuery && (
                                <p className="mt-1.5 text-[11px] font-bold uppercase tracking-widest text-red-500/70 px-1">
                                    AI search active — OTT filters are only applied in mood mode
                                </p>
                            )}
                        </div>

                        <AnimatePresence mode="wait">
                            {aiQuery ? (
                                /* AI mode: replace mood cards with inline OTT filter */
                                <motion.div
                                    key="ai-ott"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.25, ease: "easeInOut" }}
                                >
                                    {renderOttFilterContent(false)}
                                </motion.div>
                            ) : (
                                /* Default: mood cards + OTT below (desktop only) */
                                <motion.div
                                    key="mood-cards"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-6"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1 h-px bg-zinc-800/60" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">or pick a vibe</span>
                                        <div className="flex-1 h-px bg-zinc-800/60" />
                                    </div>

                                    <motion.div
                                        animate={{ opacity: cardsVisible ? 1 : 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="grid gap-4 md:grid-cols-3"
                                    >
                                        {displayedMoods.map((mood) => {
                                            const isSelected = selectedMood === mood.id
                                            return (
                                                <button
                                                    key={mood.id}
                                                    className={`group relative flex items-center md:flex-col md:justify-center md:py-12 md:px-4 md:aspect-[3/4] p-6 rounded-xl bg-gradient-to-r md:bg-gradient-to-b md:bg-black border transition-all duration-300 text-left md:text-center w-full overflow-hidden transform-gpu will-change-transform ${isSelected
                                                        ? "border-red-500/60 ring-1 ring-red-500/30 scale-[1.02]"
                                                        : selectedMood && !isSelected
                                                            ? "border-zinc-800/40 opacity-50"
                                                            : "border-zinc-800 hover:border-zinc-600 hover:scale-[1.02]"
                                                        }`}
                                                    onClick={() => handleMoodSelect(mood.id)}
                                                >
                                                    <div className={`absolute inset-0 bg-gradient-to-t md:bg-gradient-to-t ${mood.gradient}`} />
                                                    <div
                                                        className="absolute inset-0 opacity-[0.12] mix-blend-soft-light"
                                                        style={{ backgroundImage: NOISE_TEXTURE, backgroundSize: "200px 200px" }}
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/75 via-zinc-950/20 to-zinc-950/60" />
                                                    <div className="absolute inset-0 bg-white/[0.04] opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10" />
                                                    {isSelected && (
                                                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-600 flex items-center justify-center">
                                                            <Check className="w-3.5 h-3.5 text-white" />
                                                        </div>
                                                    )}
                                                    <div className="relative mr-5 md:mr-0 md:mb-3 p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 group-hover:border-zinc-700 transition-colors text-zinc-400 group-hover:text-white">
                                                        {mood.icon}
                                                    </div>
                                                    <div className="relative">
                                                        <h3 className={`font-black text-lg md:text-md uppercase tracking-wide mb-1 transition-colors ${isSelected ? "text-red-500" : "text-white group-hover:text-red-500"}`}>
                                                            {mood.label}
                                                        </h3>
                                                        <p className="text-zinc-500 text-sm font-medium mt-1 md:mt-2">
                                                            {mood.description}
                                                        </p>
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </motion.div>

                                    {/* Shuffle Controls */}
                                    {!selectedMood && (
                                        <div className="flex justify-center pt-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleShuffle}
                                                className="rounded-full bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-zinc-700"
                                            >
                                                <Shuffle className="w-4 h-4 mr-2" />
                                                Shuffle Options
                                            </Button>
                                        </div>
                                    )}

                                    {/* Desktop OTT Filter — only for mood pill path */}
                                    <div className="hidden md:block">
                                        <AnimatePresence>
                                            {selectedMood && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: "auto" }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                                    className="overflow-hidden"
                                                >
                                                    {renderOttFilterContent(false)}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>

            {/* Mobile Sticky Bottom Bar — only for mood pill path; AI mode shows OTT inline */}
            <div className="md:hidden">
                <AnimatePresence>
                    {selectedMood && (
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed inset-x-0 bottom-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-t border-zinc-800/60 p-4 pb-8 rounded-t-2xl shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.5)]"
                        >
                            {renderOttFilterContent(true)}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
