"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { type Movie, getMoviesByIds } from "@/lib/movies"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"

import Image from "next/image"
import { trackResultsViewed, trackResultMovieClick, trackResultsStartOver } from "@/lib/analytics"
import { Play, Info } from "lucide-react"

export default function ResultsPage() {
    const router = useRouter()
    const [likes, setLikes] = useState<Movie[]>([])
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [isDuo, setIsDuo] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [hasWiggled, setHasWiggled] = useState(false)
    const [synopsisOpenId, setSynopsisOpenId] = useState<string | null>(null)

    const [watchForData, setWatchForData] = useState<Record<string, string>>({})

    const carouselRef = useRef<HTMLDivElement>(null)

    // Keyboard controls: ← → navigate movies, Enter = Watch Now, Space = toggle synopsis, Esc = close synopsis
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (likes.length === 0) return
            const tag = (e.target as Element).tagName
            if (tag === "INPUT" || tag === "TEXTAREA") return

            const currentIndex = likes.findIndex((m) => m.id === selectedId)

            if (e.key === "ArrowRight") {
                e.preventDefault()
                const nextIndex = Math.min(currentIndex + 1, likes.length - 1)
                if (nextIndex !== currentIndex) {
                    const next = likes[nextIndex]
                    setSynopsisOpenId(null)
                    setSelectedId(next.id)
                    document.querySelector(`[data-id="${next.id}"]`)
                        ?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
                }
            } else if (e.key === "ArrowLeft") {
                e.preventDefault()
                const prevIndex = Math.max(currentIndex - 1, 0)
                if (prevIndex !== currentIndex) {
                    const prev = likes[prevIndex]
                    setSynopsisOpenId(null)
                    setSelectedId(prev.id)
                    document.querySelector(`[data-id="${prev.id}"]`)
                        ?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
                }
            } else if (e.key === "Enter") {
                e.preventDefault()
                if (selectedId) {
                    const movie = likes.find((m) => m.id === selectedId)
                    if (movie) {
                        if (movie.youtube_url) {
                            window.open(movie.youtube_url, "_blank")
                        } else {
                            const query = encodeURIComponent(`${movie.title} movie ${movie.year} watch`)
                            window.open(`https://www.google.com/search?q=${query}`, "_blank")
                        }
                    }
                }
            } else if (e.key === " ") {
                e.preventDefault()
                if (selectedId) setSynopsisOpenId((prev) => (prev === selectedId ? null : selectedId))
            } else if (e.key === "Escape") {
                setSynopsisOpenId(null)
            }
        }

        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [likes, selectedId, synopsisOpenId])

    useEffect(() => {
        const carousel = carouselRef.current;
        if (!carousel || likes.length === 0) return;

        let rafId: number;
        let debounceTimer: ReturnType<typeof setTimeout>;
        let lastId: string | null = null;

        // Use getBoundingClientRect so positions are always in viewport space —
        // no dependency on offsetParent or CSS positioning of the carousel.
        const detectCenteredCard = () => {
            const carouselRect = carousel.getBoundingClientRect();
            const containerCx = carouselRect.left + carouselRect.width / 2;
            let closestId: string | null = null;
            let closestDist = Infinity;

            Array.from(carousel.children).forEach(child => {
                const el = child as HTMLElement;
                const rect = el.getBoundingClientRect();
                const dist = Math.abs((rect.left + rect.width / 2) - containerCx);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestId = el.getAttribute('data-id');
                }
            });

            if (closestId && closestId !== lastId) {
                lastId = closestId;
                setSelectedId(closestId);
                setSynopsisOpenId(null);
            }
        };

        const onScroll = () => {
            // Real-time update during the swipe
            cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(detectCenteredCard);
            // 250ms debounce as universal fallback: fires after scroll events stop,
            // which covers snap completion even when no scrollend event fires.
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(detectCenteredCard, 250);
        };

        // scrollend is the most reliable signal on modern browsers; cancel the debounce
        // and detect immediately when it fires.
        const onScrollEnd = () => {
            clearTimeout(debounceTimer);
            cancelAnimationFrame(rafId);
            detectCenteredCard();
        };

        carousel.addEventListener('scroll', onScroll, { passive: true });
        carousel.addEventListener('scrollend', onScrollEnd, { passive: true });

        return () => {
            carousel.removeEventListener('scroll', onScroll);
            carousel.removeEventListener('scrollend', onScrollEnd);
            cancelAnimationFrame(rafId);
            clearTimeout(debounceTimer);
        };
    }, [likes, isLoading]);

    useEffect(() => {
        const run = async () => {
            const tmdbResults = sessionStorage.getItem("tmdb_solo_results")
            const duoResults = sessionStorage.getItem("duo_results")
            const soloResults = sessionStorage.getItem("solo_results")

            let likedMovies: Movie[] = []

            if (tmdbResults) {
                likedMovies = JSON.parse(tmdbResults) as Movie[]
                trackResultsViewed("solo", likedMovies.length)
                if (likedMovies.length > 0) setSelectedId(likedMovies[0].id)
            } else {
                const saved = duoResults || soloResults
                const mode = duoResults ? "dual" : "solo"
                if (duoResults) setIsDuo(true)

                if (saved) {
                    const likedIds = JSON.parse(saved) as string[]
                    try {
                        likedMovies = await getMoviesByIds(likedIds)
                        trackResultsViewed(mode, likedMovies.length)
                        if (likedMovies.length > 0) setSelectedId(likedMovies[0].id)
                    } catch {
                        // fall through with empty array
                    }
                } else {
                    trackResultsViewed(mode, 0)
                }
            }

            setLikes(likedMovies)

            if (likedMovies.length > 0) {
                const cacheKey = "watch_for_cache"
                const currentIds = likedMovies.map(m => m.id).sort().join(",")
                const cached = sessionStorage.getItem(cacheKey)

                if (cached) {
                    try {
                        const { ids, data } = JSON.parse(cached)
                        if (ids === currentIds) {
                            setWatchForData(data)
                            setIsLoading(false)
                            return
                        }
                    } catch {
                        // corrupt cache — ignore and re-fetch
                    }
                }

                try {
                    const res = await fetch('/api/watch-for', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            movies: likedMovies.map(m => ({ id: m.id, title: m.title, overview: m.overview }))
                        })
                    })
                    const json = await res.json()
                    if (json.watchFor) {
                        setWatchForData(json.watchFor)
                        sessionStorage.setItem(cacheKey, JSON.stringify({ ids: currentIds, data: json.watchFor }))
                    }
                } catch (err) {
                    console.error("Failed to fetch watch for data:", err)
                }
            }

            setIsLoading(false)
        }

        run()
    }, []);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-black text-white dot-pattern">
                <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col bg-black text-white dot-pattern overflow-hidden">
            <div className="fixed inset-0 bg-gradient-to-b from-transparent via-black/80 to-black pointer-events-none z-0" />

            <div className="relative z-10 flex flex-col flex-1 min-h-0 max-w-3xl mx-auto w-full px-4">
                <header className="text-center space-y-1 pt-4 pb-3 flex-shrink-0">
                    <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none">{isDuo ? "Mutual" : "Your"} <span className="text-red-600">Shortlist</span></h1>
                    <p className="text-zinc-500 font-medium text-base">
                        {isDuo ? "You both liked" : "You liked"} <span className="text-white font-bold">{likes.length}</span> {likes.length === 1 ? "movie" : "movies"}.
                    </p>
                </header>

                <div className="flex-1 min-h-0 flex flex-col justify-center">
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
                        <>
                            <div
                                ref={carouselRef}
                                className="flex gap-3 md:gap-5 overflow-x-auto snap-x snap-mandatory items-center px-[12vw] md:px-[calc(50%_-_330px)] py-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                            >
                                {likes.map((movie) => {
                                    const isSelected = movie.id === selectedId
                                    return (
                                        <motion.div
                                            key={movie.id}
                                            data-id={movie.id}
                                            onClick={(e) => {
                                                if (isSelected) {
                                                    if (synopsisOpenId === movie.id) setSynopsisOpenId(null);
                                                } else {
                                                    trackResultMovieClick(movie.id, movie.title);
                                                    setSynopsisOpenId(null);
                                                    setSelectedId(movie.id);
                                                    if (window.innerWidth < 768) {
                                                        e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                                                    }
                                                }
                                            }}
                                            className={`relative flex-shrink-0 cursor-pointer rounded-2xl overflow-hidden group w-[58vw] md:w-[200px] aspect-[2/3] snap-center transition-[filter] duration-75 ease-out ${isSelected ? "blur-none" : "blur-[6px]"}`}
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
                                                default: { duration: 0.08, ease: "easeOut" }
                                            }}
                                            style={{ willChange: "transform, opacity" }}
                                        >
                                            {/* Glow border for selected */}
                                            <motion.div
                                                animate={{ opacity: isSelected ? 1 : 0 }}
                                                transition={{ duration: 0.08 }}
                                                className="absolute inset-0 rounded-2xl border border-zinc-600/50 shadow-[0_0_30px_-5px_rgba(220,38,38,0.3)] z-30 pointer-events-none"
                                            />

                                            {/* Poster */}
                                            <Image
                                                src={movie.poster_url}
                                                alt={movie.title}
                                                fill
                                                className="object-cover"
                                            />

                                            {/* Gradient overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                                            {/* Action button — bottom-right, focused card only */}
                                            {isSelected && (
                                                movie.youtube_url ? (
                                                    <a
                                                        href={movie.youtube_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="absolute bottom-4 right-4 z-20 w-7 h-7 flex items-center justify-center bg-red-600/90 backdrop-blur-sm rounded-full border border-red-500/50 text-white"
                                                    >
                                                        <Play className="w-3.5 h-3.5 fill-white" />
                                                    </a>
                                                ) : (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSynopsisOpenId(synopsisOpenId === movie.id ? null : movie.id);
                                                        }}
                                                        className="absolute bottom-4 right-4 z-20 w-7 h-7 flex items-center justify-center bg-white/15 backdrop-blur-sm rounded-full border border-white/20 text-white"
                                                    >
                                                        <Info className="w-3.5 h-3.5" />
                                                    </button>
                                                )
                                            )}

                                            {/* Synopsis slide-up panel — not used for YouTube films */}
                                            {!movie.youtube_url && (
                                                <AnimatePresence>
                                                    {synopsisOpenId === movie.id && (
                                                        <motion.div
                                                            initial={{ y: "100%" }}
                                                            animate={{ y: 0 }}
                                                            exit={{ y: "100%" }}
                                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                            className="absolute inset-x-0 bottom-0 h-[65%] z-20 bg-black/92 backdrop-blur-md p-4 flex flex-col overflow-hidden"
                                                        >
                                                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500 mb-2">Synopsis</p>
                                                            <p className="text-sm text-zinc-300 leading-relaxed overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                                                {movie.overview || "No synopsis available."}
                                                            </p>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            )}

                                            {/* Info overlay at bottom */}
                                            <div className="absolute bottom-0 w-full p-5 z-10">
                                                {movie.youtube_url ? (
                                                    /* AI Film info */
                                                    <>
                                                        <div className="mb-2">
                                                            <span className="inline-flex items-center gap-1 bg-red-600/80 text-white px-2 py-0.5 rounded text-[10px] font-black tracking-wide leading-none uppercase">
                                                                AI Film
                                                            </span>
                                                        </div>
                                                        <h3 className="text-2xl font-black uppercase leading-none tracking-tighter text-white mb-1.5">
                                                            {movie.title}
                                                        </h3>
                                                        <p className="text-zinc-400 text-[11px] leading-relaxed">
                                                            by {movie.overview}
                                                        </p>
                                                    </>
                                                ) : (
                                                    /* Standard movie info */
                                                    <>
                                                        <div className="flex items-center gap-2.5 mb-2">
                                                            <span className="inline-flex items-center gap-1 bg-[#F5C518] text-black px-2 py-0.5 rounded text-[10px] font-black tracking-wide leading-none">
                                                                IMDb <span className="text-xs font-black">{movie.imdb_rating}</span>
                                                            </span>
                                                            <span className="text-zinc-400 text-sm font-semibold tracking-wider">
                                                                {movie.year}
                                                            </span>
                                                        </div>
                                                        <h3 className="text-2xl font-black uppercase leading-none tracking-tighter text-white mb-1.5">
                                                            {movie.title}
                                                        </h3>
                                                        <div className="flex flex-wrap items-center gap-2.5 mb-2">
                                                            {(Array.isArray(movie.genre) ? movie.genre : [movie.genre]).map((g, i) => (
                                                                <span key={i} className="text-[#F5C518] text-[10px] font-bold uppercase tracking-[0.2em]">
                                                                    {g}
                                                                </span>
                                                            ))}
                                                        </div>
                                                        {movie.ott_providers && movie.ott_providers.length > 0 && (
                                                            <div className="flex flex-wrap items-center gap-1.5">
                                                                {movie.ott_providers.map((provider, i) => (
                                                                    <span key={i} className="bg-white/10 backdrop-blur-sm text-zinc-300 text-[9px] font-semibold px-2 py-0.5 rounded-full border border-white/10">
                                                                        {provider}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </motion.div>
                                    )
                                })}
                            </div>

                            {/* Pagination Dots (Mobile Only) */}
                            <div className="flex justify-center items-center gap-2 mt-3 md:hidden flex-shrink-0">
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
                        </>
                    )}
                </div>

                <div className="flex-shrink-0 pb-7 pt-2 space-y-5 relative">
                    {/* Watch For Pill */}
                    <div className="flex justify-center mb-3">
                        <div className="relative h-7 flex items-center justify-center">
                            <AnimatePresence mode="wait">
                                {selectedId && watchForData[selectedId] && (
                                    <motion.div
                                        key={selectedId}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        transition={{ duration: 0.25, ease: "easeInOut" }}
                                        className="bg-zinc-900 px-5 py-1.5 rounded-full border border-zinc-700 shadow-xl"
                                    >
                                        <span className="text-white text-[10px] font-bold uppercase tracking-wider">
                                            Watch For: <span className="text-red-500">{watchForData[selectedId]}</span>
                                        </span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <Button
                        className="w-full h-14 bg-red-600 hover:bg-red-700 text-white font-black italic uppercase tracking-tighter rounded-full shadow-[0_0_30px_-10px_rgba(220,38,38,0.5)] transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
                        disabled={!selectedId}
                        onClick={() => {
                            const selectedMovie = likes.find(m => m.id === selectedId);
                            if (selectedMovie) {
                                if (selectedMovie.youtube_url) {
                                    window.open(selectedMovie.youtube_url, '_blank');
                                } else {
                                    const query = encodeURIComponent(`${selectedMovie.title} movie ${selectedMovie.year} watch`);
                                    window.open(`https://www.google.com/search?q=${query}`, '_blank');
                                }
                            }
                        }}
                    >
                        <Play className="w-4 h-4 fill-white text-white flex-shrink-0" />
                        {likes.find(m => m.id === selectedId)?.youtube_url ? "Watch on YouTube" : "Watch Now"}
                    </Button>
                    <p className="text-center text-sm tracking-wide text-zinc-400">
                        Built with ❤️ by{" "}
                        <a
                            href="https://anujk.in"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-300 underline underline-offset-2 hover:text-white transition-colors"
                        >
                            Anuj
                        </a>
                    </p>
                </div>
            </div>
        </div>
    )
}
