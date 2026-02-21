"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { type Movie, getMoviesByIds } from "@/lib/movies"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

import Image from "next/image"
import { Home, Play } from "lucide-react"
import { trackResultsViewed, trackResultMovieClick, trackResultsHome, trackResultsStartOver } from "@/lib/analytics"

export default function ResultsPage() {
    const router = useRouter()
    const [likes, setLikes] = useState<Movie[]>([])
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [isDuo, setIsDuo] = useState(false)

    useEffect(() => {
        const duoResults = sessionStorage.getItem("duo_results")
        const soloResults = sessionStorage.getItem("solo_results")
        const saved = duoResults || soloResults
        const mode = duoResults ? "dual" : "solo"

        if (duoResults) setIsDuo(true)

        if (saved) {
            const likedIds = JSON.parse(saved) as string[]
            getMoviesByIds(likedIds).then((likedMovies) => {
                setLikes(likedMovies)
                trackResultsViewed(mode, likedMovies.length)
                if (likedMovies.length > 0) {
                    setSelectedId(likedMovies[0].id)
                }
            })
        } else {
            trackResultsViewed(mode, 0)
        }
    }, [])

    return (
        <div className="flex-1 md:min-h-screen p-4 bg-black text-white dot-pattern overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/80 to-black pointer-events-none" />

            <div className="relative z-10 max-w-3xl mx-auto flex flex-col h-full md:min-h-screen">
                <header className="text-center space-y-1 md:space-y-4 pt-2 md:pt-12 pb-2 md:pb-8">
                    <h1 className="text-2xl md:text-5xl font-black uppercase tracking-tighter leading-none">{isDuo ? "Mutual" : "Your"} <span className="text-red-600">Shortlist</span></h1>
                    <p className="text-zinc-500 font-medium text-sm md:text-lg">
                        {isDuo ? "You both liked" : "You liked"} <span className="text-white font-bold">{likes.length}</span> {likes.length === 1 ? "movie" : "movies"}.
                    </p>
                </header>

                <div className="flex-1 pb-24 overflow-y-auto scrollbar-hide">
                    {likes.length === 0 ? (
                        <div className="text-center p-12 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20 space-y-6">
                            <p className="text-zinc-500 font-medium">No movies liked. Tough crowd!</p>
                            <Button
                                onClick={() => { trackResultsStartOver(); router.push("/"); }}
                                className="h-12 px-8 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wider rounded-full shadow-[0_0_20px_-5px_rgba(220,38,38,0.5)] transition-all hover:scale-[1.02]"
                            >
                                Start Over
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full w-full max-w-[400px] md:max-w-none mx-auto">
                            <div className="flex-1 flex overflow-x-auto snap-x snap-mandatory scrollbar-hide md:grid md:grid-cols-3 md:gap-5 md:overflow-visible items-center"
                                onScroll={(e) => {
                                    // Only run scroll logic on mobile/tablets where it's a flex row
                                    if (window.innerWidth >= 768) return;

                                    const container = e.currentTarget;
                                    const scrollLeft = container.scrollLeft;
                                    const itemWidth = container.clientWidth;
                                    // Calculate which item is mostly in view
                                    const activeIndex = Math.round(scrollLeft / itemWidth);

                                    if (likes[activeIndex] && likes[activeIndex].id !== selectedId) {
                                        setSelectedId(likes[activeIndex].id);
                                    }
                                }}
                            >
                                {likes.map((movie) => {
                                    const isSelected = movie.id === selectedId
                                    return (
                                        <div key={movie.id} className="w-full flex-shrink-0 snap-center px-2 md:px-0 md:w-auto h-full flex flex-col justify-center">
                                            <motion.div
                                                layout
                                                onClick={() => { trackResultMovieClick(movie.id, movie.title); setSelectedId(movie.id); }}
                                                className="relative cursor-pointer rounded-2xl overflow-hidden group w-full max-h-[55vh] md:max-h-[70vh] aspect-[2/3] mx-auto"
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
                                                <div className="relative w-full h-full">
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
                                                        <div className="flex flex-wrap items-center gap-2.5 mb-2">
                                                            {(Array.isArray(movie.genre) ? movie.genre : [movie.genre]).map((g, i) => (
                                                                <span key={i} className="text-[#F5C518] text-[10px] font-bold uppercase tracking-[0.2em]">
                                                                    {g}
                                                                </span>
                                                            ))}
                                                        </div>

                                                        {/* OTT Providers */}
                                                        {movie.ott_providers && movie.ott_providers.length > 0 && (
                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                                {movie.ott_providers.map((provider, i) => (
                                                                    <span key={i} className="bg-white/10 backdrop-blur-sm text-zinc-300 text-[9px] font-semibold px-2 py-0.5 rounded-full border border-white/10">
                                                                        {provider}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Pagination Dots (Mobile Only) */}
                            <div className="flex justify-center gap-2 mt-3 md:hidden">
                                {likes.map((movie) => (
                                    <div
                                        key={`dot-${movie.id}`}
                                        className={`h-1.5 rounded-full transition-all duration-300 ${movie.id === selectedId ? "w-6 bg-red-600" : "w-1.5 bg-zinc-700"}`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="fixed bottom-0 left-0 w-full p-4 md:p-6 bg-gradient-to-t from-black via-black to-transparent z-20">
                    <div className="max-w-3xl mx-auto flex flex-col items-center">
                        <Button
                            className="w-full h-14 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wider rounded-2xl shadow-[0_0_20px_-5px_rgba(220,38,38,0.5)] transition-all hover:scale-[1.02] text-lg"
                            onClick={() => {
                                const selectedMovie = likes.find(m => m.id === selectedId);
                                if (selectedMovie) {
                                    window.open(`https://www.google.com/search?q=${encodeURIComponent(selectedMovie.title + ' movie watch')}`, '_blank');
                                }
                            }}
                        >
                            <Play className="w-5 h-5 mr-2 fill-current" /> Watch Now
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
