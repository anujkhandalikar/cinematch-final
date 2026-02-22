"use client"

import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion"
import Image from "next/image"
import { Movie } from "@/lib/movies"
import { useState } from "react"
import { X, Heart, Info } from "lucide-react"
import { SynopsisOverlay } from "./SynopsisOverlay"
import { trackSynopsisOpen, trackSynopsisClose } from "@/lib/analytics"

interface MovieCardProps {
    movie: Movie
    onSwipe: (direction: "left" | "right") => void
    index: number
    disabled?: boolean
    selectedOtt?: string[]
}

export function MovieCard({ movie, onSwipe, index, disabled, selectedOtt }: MovieCardProps) {
    const [exitX, setExitX] = useState<number | null>(null)
    const [synopsisOpen, setSynopsisOpen] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const x = useMotionValue(0)
    const rotate = useTransform(x, [-200, 200], [-25, 25])

    // Color overlays for swipe feedback
    const rightOpacity = useTransform(x, [0, 150], [0, 0.5])
    const leftOpacity = useTransform(x, [-150, 0], [0.5, 0])

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (synopsisOpen) return
        if (info.offset.x > 100) {
            setExitX(200)
            onSwipe("right")
        } else if (info.offset.x < -100) {
            setExitX(-200)
            onSwipe("left")
        }
    }

    const handleSynopsisTap = (e: React.MouseEvent | React.TouchEvent) => {
        e.stopPropagation()
        e.preventDefault()
        trackSynopsisOpen(movie.id, movie.title)
        setSynopsisOpen(true)
    }

    // Only the top card (index 0) is interactive
    const isFront = index === 0

    // Truncate overview for card display
    const truncatedOverview = movie.overview.length > 90
        ? movie.overview.substring(0, 90) + "..."
        : movie.overview

    return (
        <>
            <motion.div
                style={{
                    width: "100%",
                    height: "100%",
                    position: "absolute",
                    top: 0,
                    x: isFront ? x : 0,
                    rotate: isFront ? rotate : 0,
                    opacity: isFront ? 1 : 1 - index * 0.05,
                    zIndex: 100 - index,
                    scale: 1 - index * 0.05,
                    y: index * 15,
                }}
                drag={isFront && !synopsisOpen && !disabled ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                onDragStart={() => setIsDragging(true)}
                onDragEnd={(event, info) => { setIsDragging(false); handleDragEnd(event, info); }}
                animate={exitX !== null ? { x: exitX * 2, opacity: 0 } : {}}
                transition={{ duration: 0.2 }}
                className="relative rounded-3xl overflow-hidden shadow-2xl bg-zinc-900 border border-zinc-800 cursor-grab active:cursor-grabbing"
            >
                {/* Swipe Feedback Overlay - RIGHT (Like) */}
                <motion.div
                    style={{ opacity: rightOpacity }}
                    className="absolute inset-0 bg-green-500/30 z-20 flex items-center justify-center pointer-events-none"
                >
                    <Heart className="w-32 h-32 text-white fill-current drop-shadow-lg" />
                </motion.div>

                {/* Swipe Feedback Overlay - LEFT (Pass) */}
                <motion.div
                    style={{ opacity: leftOpacity }}
                    className="absolute inset-0 bg-red-600/30 z-20 flex items-center justify-center pointer-events-none"
                >
                    <X className="w-32 h-32 text-white drop-shadow-lg" />
                </motion.div>

                {/* Movie Poster */}
                <div className="relative w-full h-full">
                    <Image
                        src={movie.poster_url}
                        alt={movie.title}
                        fill
                        className="object-cover"
                        priority={index < 2}
                        draggable={false}
                    />

                    {/* Gradient & Text Content */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

                    <div className="absolute bottom-0 w-full p-6 pt-16 text-white z-10">
                        {/* IMDb Rating + Year */}
                        <div className="flex items-center gap-3 mb-2">
                            <span className="inline-flex items-center gap-1 bg-[#F5C518] text-black px-2 py-0.5 rounded text-[10px] font-black tracking-wide leading-none">
                                IMDb <span className="text-xs font-black">{movie.imdb_rating}</span>
                            </span>
                            <span className="text-zinc-400 text-sm font-semibold tracking-wider">
                                {movie.year}
                            </span>
                            {movie.media_type === "tv" && (
                                <span className="inline-flex items-center gap-1 bg-purple-600/80 text-white px-2 py-0.5 rounded text-[10px] font-black tracking-wide leading-none uppercase ml-auto">
                                    TV Series
                                </span>
                            )}
                        </div>

                        {/* Title */}
                        <h2 className="text-3xl font-black uppercase leading-none tracking-tighter drop-shadow-md mb-2">
                            {movie.title}
                        </h2>

                        {/* Genres */}
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                            {(Array.isArray(movie.genre) ? movie.genre : [movie.genre]).map((g, i) => (
                                <span key={i} className="text-[#F5C518] text-[10px] font-bold uppercase tracking-[0.2em]">
                                    {g}
                                </span>
                            ))}
                        </div>

                        {/* OTT Providers */}
                        {movie.ott_providers && movie.ott_providers.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 mb-3">
                                {movie.ott_providers.map((provider, i) => {
                                    const isMatch = selectedOtt?.includes(provider)
                                    return (
                                        <span
                                            key={i}
                                            className={
                                                isMatch
                                                    ? "bg-red-600/90 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full border border-red-500/50 shadow-[0_0_8px_-2px_rgba(220,38,38,0.5)]"
                                                    : "bg-white/10 backdrop-blur-sm text-zinc-300 text-[9px] font-semibold px-2 py-0.5 rounded-full border border-white/10"
                                            }
                                        >
                                            {isMatch ? `✓ ${provider}` : provider}
                                        </span>
                                    )
                                })}
                            </div>
                        )}

                        {/* Synopsis - tappable */}
                        <div
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={handleSynopsisTap}
                            className="cursor-pointer select-none"
                        >
                            <p className="text-zinc-400 text-sm leading-relaxed line-clamp-2">
                                {truncatedOverview}
                            </p>
                        </div>
                    </div>

                    {/* Info icon — bottom-right, only on front card when at rest */}
                    {isFront && !isDragging && (
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={handleSynopsisTap}
                            className="absolute bottom-4 right-4 z-20 w-7 h-7 flex items-center justify-center bg-white/15 backdrop-blur-sm rounded-full border border-white/20 text-white"
                        >
                            <Info className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </motion.div>

            {/* Synopsis Full-Screen Overlay */}
            {isFront && (
                <SynopsisOverlay
                    movie={movie}
                    isOpen={synopsisOpen}
                    onClose={() => { trackSynopsisClose(movie.id); setSynopsisOpen(false); }}
                />
            )}
        </>
    )
}
