"use client"

import { useEffect, useState, useRef } from "react"
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
    const [isLoading, setIsLoading] = useState(true)
    const [hasWiggled, setHasWiggled] = useState(false)
    const carouselRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!carouselRef.current || likes.length === 0) return;

        const observer = new IntersectionObserver((entries) => {
            if (window.innerWidth >= 768) return;
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                    const id = entry.target.getAttribute('data-id');
                    if (id) setSelectedId(id);
                }
            });
        }, {
            root: carouselRef.current,
            threshold: 0.5
        });

        const children = Array.from(carouselRef.current.children);
        children.forEach(child => observer.observe(child));

        return () => observer.disconnect();
    }, [likes]);

    useEffect(() => {
        const duoResults = sessionStorage.getItem("duo_results")
        const soloResults = sessionStorage.getItem("solo_results")
        const saved = duoResults || soloResults
        const mode = duoResults ? "dual" : "solo"
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (duoResults) setIsDuo(true)

        if (saved) {
            const likedIds = JSON.parse(saved) as string[]
            getMoviesByIds(likedIds).then((likedMovies) => {
                setLikes(likedMovies)
                trackResultsViewed(mode, likedMovies.length)
                if (likedMovies.length > 0) {
                    setSelectedId(likedMovies[0].id)
                }
                setIsLoading(false)
            }).catch(() => {
                setIsLoading(false)
            })
        } else {
            trackResultsViewed(mode, 0)
            setIsLoading(false)
        }
    }, [])

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-black text-white dot-pattern">
                <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen p-4 bg-black text-white dot-pattern relative">
            <div className="fixed inset-0 bg-gradient-to-b from-transparent via-black/80 to-black pointer-events-none z-0" />

            <div className="relative z-10 max-w-3xl mx-auto flex flex-col">
                <header className="text-center space-y-2 pt-2 pb-4">
                    <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none">{isDuo ? "Mutual" : "Your"} <span className="text-red-600">Shortlist</span></h1>
                    <p className="text-zinc-500 font-medium text-base">
                        {isDuo ? "You both liked" : "You liked"} <span className="text-white font-bold">{likes.length}</span> {likes.length === 1 ? "movie" : "movies"}.
                    </p>
                </header>

                <div className="pb-20">
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
                        <div
                            ref={carouselRef}
                            className="flex md:grid md:grid-cols-3 gap-3 md:gap-5 overflow-x-auto snap-x snap-mandatory items-center px-[12vw] md:px-0 pb-8 pt-4 md:pb-0 md:pt-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                        >
                            {likes.map((movie) => {
                                const isSelected = movie.id === selectedId
                                return (
                                    <motion.div
                                        key={movie.id}
                                        data-id={movie.id}
                                        layout
                                        onClick={(e) => {
                                            trackResultMovieClick(movie.id, movie.title);
                                            setSelectedId(movie.id);
                                            if (window.innerWidth < 768) {
                                                e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                                            }
                                        }}
                                        className="relative flex-shrink-0 cursor-pointer rounded-2xl overflow-hidden group w-[58vw] md:w-auto snap-center"
                                        initial={!hasWiggled ? { x: 50, opacity: 0 } : false}
                                        animate={{
                                            x: 0,
                                            scale: isSelected ? 1.0 : 0.85,
                                            opacity: isSelected ? 1 : 0.4,
                                        }}
                                        onAnimationComplete={() => setHasWiggled(true)}
                                        whileHover={!isSelected ? { opacity: 0.7 } : {}}
                                        transition={{
                                            x: { type: "spring", stiffness: 300, damping: 25, delay: 0.1 },
                                            default: { duration: 0.35, ease: [0.22, 1, 0.36, 1] }
                                        }}
                                        style={{
                                            filter: isSelected ? "blur(0px)" : "blur(8px)",
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
                                )
                            })}
                        </div>
                    )}

                    {/* Pagination Dots (Mobile Only) */}
                    {likes.length > 0 && (
                        <div className="flex justify-center items-center gap-2 mt-6 md:hidden">
                            {likes.map((movie) => (
                                <motion.div
                                    key={`dot-${movie.id}`}
                                    className={`h-1.5 rounded-full ${movie.id === selectedId ? 'bg-red-600' : 'bg-zinc-700'}`}
                                    animate={{
                                        width: movie.id === selectedId ? 24 : 6,
                                        opacity: movie.id === selectedId ? 1 : 0.5
                                    }}
                                    transition={{ duration: 0.3 }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="fixed bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black via-black to-transparent z-20">
                    <div className="max-w-3xl mx-auto flex flex-col items-center gap-3">
                        <div className="w-full flex gap-3">
                            <Button
                                className="flex-1 h-14 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white font-bold uppercase tracking-wider rounded-full transition-all"
                                variant="outline"
                                onClick={() => { trackResultsHome(likes.length); router.push("/"); }}
                            >
                                <Home className="w-5 h-5 mr-2" /> Home
                            </Button>
                            <Button
                                className="flex-1 h-14 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wider rounded-full shadow-[0_0_20px_-5px_rgba(220,38,38,0.5)] transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!selectedId}
                                onClick={() => {
                                    const selectedMovie = likes.find(m => m.id === selectedId);
                                    if (selectedMovie) {
                                        const query = encodeURIComponent(`${selectedMovie.title} movie ${selectedMovie.year} watch`);
                                        window.open(`https://www.google.com/search?q=${query}`, '_blank');
                                    }
                                }}
                            >
                                Watch Now
                            </Button>
                        </div>
                        <div className="text-zinc-400 text-sm tracking-wide">
                            Built with ❤️ by <a href="https://anujk.in" target="_blank" rel="noopener noreferrer" className="text-zinc-300 underline underline-offset-2 hover:text-white transition-colors">Anuj</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
