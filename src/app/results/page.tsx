"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { type Movie, getMoviesByIds } from "@/lib/movies"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

import Image from "next/image"
import { Home, Share2 } from "lucide-react"

export default function ResultsPage() {
    const router = useRouter()
    const [likes, setLikes] = useState<Movie[]>([])
    const [selectedId, setSelectedId] = useState<string | null>(null)

    useEffect(() => {
        const saved = sessionStorage.getItem("solo_results")
        if (saved) {
            const likedIds = JSON.parse(saved) as string[]
            getMoviesByIds(likedIds).then((likedMovies) => {
                setLikes(likedMovies)
                // Pre-select the first liked movie
                if (likedMovies.length > 0) {
                    setSelectedId(likedMovies[0].id)
                }
            })
        }
    }, [])

    return (
        <div className="min-h-screen p-4 bg-black text-white dot-pattern overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/80 to-black pointer-events-none" />

            <div className="relative z-10 max-w-3xl mx-auto flex flex-col h-full min-h-screen">
                <header className="text-center space-y-4 pt-12 pb-8">
                    <span className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900/80 px-4 py-1.5 text-xs font-medium text-zinc-400 uppercase tracking-widest backdrop-blur-sm">
                        <span className="flex h-2 w-2 rounded-full bg-red-600 mr-2 animate-pulse"></span>
                        Mission Accomplished
                    </span>
                    <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">Your <span className="text-red-600">Shortlist</span></h1>
                    <p className="text-zinc-500 font-medium text-lg">
                        You liked <span className="text-white font-bold">{likes.length}</span> movies.
                    </p>
                </header>

                <div className="flex-1 pb-28 overflow-y-auto scrollbar-hide">
                    {likes.length === 0 ? (
                        <div className="text-center p-12 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20 space-y-6">
                            <p className="text-zinc-500 font-medium">No movies liked. Tough crowd!</p>
                            <Button
                                onClick={() => router.push("/")}
                                className="h-12 px-8 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wider rounded-full shadow-[0_0_20px_-5px_rgba(220,38,38,0.5)] transition-all hover:scale-[1.02]"
                            >
                                Start Over
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
                            {likes.map((movie) => {
                                const isSelected = movie.id === selectedId
                                return (
                                    <motion.div
                                        key={movie.id}
                                        layout
                                        onClick={() => setSelectedId(movie.id)}
                                        className="relative cursor-pointer rounded-2xl overflow-hidden group"
                                        animate={{
                                            scale: isSelected ? 1.0 : 0.95,
                                            opacity: isSelected ? 1 : 0.5,
                                        }}
                                        whileHover={!isSelected ? { opacity: 0.7 } : {}}
                                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                                        style={{
                                            filter: isSelected ? "blur(0px)" : "blur(4px)",
                                        }}
                                    >
                                        {/* Glow border for selected */}
                                        {isSelected && (
                                            <motion.div
                                                layoutId="tile-glow"
                                                className="absolute inset-0 rounded-2xl border border-zinc-600/50 shadow-[0_0_30px_-5px_rgba(220,38,38,0.3)] z-30 pointer-events-none"
                                                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                                            />
                                        )}

                                        {/* Poster */}
                                        <div className="relative aspect-[2/3] w-full">
                                            <Image
                                                src={movie.poster_url}
                                                alt={movie.title}
                                                fill
                                                className="object-cover"
                                            />

                                            {/* Gradient overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                                            {/* Info overlay at bottom */}
                                            <div className="absolute bottom-0 w-full p-5 z-10">
                                                {/* IMDb + Year */}
                                                <div className="flex items-center gap-2.5 mb-2">
                                                    <span className="inline-flex items-center gap-1 bg-[#F5C518] text-black px-2 py-0.5 rounded text-[10px] font-black tracking-wide leading-none">
                                                        IMDb <span className="text-xs font-black">{movie.imdb_rating}</span>
                                                    </span>
                                                    <span className="text-zinc-400 text-sm font-semibold tracking-wider">
                                                        {movie.year}
                                                    </span>
                                                </div>

                                                {/* Title */}
                                                <h3 className="text-2xl font-black uppercase leading-none tracking-tighter text-white mb-1.5">
                                                    {movie.title}
                                                </h3>

                                                {/* Genres */}
                                                <div className="flex flex-wrap items-center gap-2.5">
                                                    {(Array.isArray(movie.genre) ? movie.genre : [movie.genre]).map((g, i) => (
                                                        <span key={i} className="text-[#F5C518] text-[10px] font-bold uppercase tracking-[0.2em]">
                                                            {g}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </div>
                    )}
                </div>

                <div className="fixed bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black via-black to-transparent z-20">
                    <div className="max-w-3xl mx-auto flex gap-4">
                        <Button
                            className="flex-1 h-14 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white font-bold uppercase tracking-wider rounded-full transition-all"
                            variant="outline"
                            onClick={() => router.push("/")}
                        >
                            <Home className="w-5 h-5 mr-2" /> Home
                        </Button>
                        <Button
                            className="flex-1 h-14 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wider rounded-full shadow-[0_0_20px_-5px_rgba(220,38,38,0.5)] transition-all"
                            onClick={() => alert("Sharing not implemented in MVP")}
                        >
                            <Share2 className="w-5 h-5 mr-2" /> Share List
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
