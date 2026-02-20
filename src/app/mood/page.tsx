"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Trophy, PartyPopper, Clapperboard, Award, Star } from "lucide-react"
import { motion } from "framer-motion"
import type { Mood } from "@/lib/movies"

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

export default function MoodPage() {
    const router = useRouter()

    const handleMoodSelect = (mood: Mood) => {
        sessionStorage.setItem("selected_mood", mood)
        router.push("/ott-filter")
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
                            {MOODS.map((mood, i) => (
                                <motion.button
                                    key={mood.id}
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.15 + i * 0.08 }}
                                    className={`group relative flex items-center md:flex-col md:justify-center md:py-12 md:px-4 md:aspect-[3/4] p-6 rounded-xl bg-gradient-to-r md:bg-gradient-to-b ${mood.gradient} border border-zinc-800 hover:border-zinc-600 hover:scale-[1.02] transition-all duration-300 text-left md:text-center w-full overflow-hidden`}
                                    onClick={() => handleMoodSelect(mood.id)}
                                >
                                    {/* Subtle glow on hover */}
                                    <div className="absolute inset-0 bg-white/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                    <div className="relative mr-5 md:mr-0 md:mb-3 p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 group-hover:border-zinc-700 transition-colors text-zinc-400 group-hover:text-white">
                                        {mood.icon}
                                    </div>
                                    <div className="relative">
                                        <h3 className="font-black text-lg md:text-sm uppercase tracking-wide text-white mb-1 md:mb-0 group-hover:text-red-500 transition-colors">
                                            {mood.label}
                                        </h3>
                                        <p className="text-zinc-500 text-sm font-medium md:hidden">
                                            {mood.description}
                                        </p>
                                    </div>
                                </motion.button>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
