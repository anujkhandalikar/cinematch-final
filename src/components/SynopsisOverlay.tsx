"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Movie } from "@/lib/movies"

interface SynopsisOverlayProps {
    movie: Movie
    isOpen: boolean
    onClose: () => void
}

export function SynopsisOverlay({ movie, isOpen, onClose }: SynopsisOverlayProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/90 backdrop-blur-md"
                    />

                    {/* Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 30 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="relative w-full max-w-[350px] rounded-3xl border border-zinc-800/60 overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: "linear-gradient(180deg, rgba(30,30,30,0.95) 0%, rgba(10,10,10,0.98) 100%)",
                        }}
                    >
                        <div className="p-8 flex flex-col gap-5">
                            {/* IMDb + Year */}
                            <div className="flex items-center gap-3">
                                <span className="inline-flex items-center gap-1.5 bg-[#F5C518] text-black px-2.5 py-1 rounded-md text-xs font-black tracking-wide">
                                    IMDb <span className="text-sm">{movie.imdb_rating}</span>
                                </span>
                                <span className="text-zinc-400 text-sm font-semibold tracking-wider">
                                    {movie.year}
                                </span>
                            </div>

                            {/* Title */}
                            <h2 className="text-4xl font-black uppercase leading-none tracking-tighter text-white">
                                {movie.title}
                            </h2>

                            {/* Genres */}
                            <div className="flex flex-wrap items-center gap-3">
                                {(Array.isArray(movie.genre) ? movie.genre : [movie.genre]).map((g, i) => (
                                    <span key={i} className="text-[#F5C518] text-xs font-bold uppercase tracking-[0.2em]">
                                        {g}
                                    </span>
                                ))}
                            </div>

                            {/* Full Synopsis */}
                            <p className="text-zinc-300 text-base leading-relaxed">
                                {movie.overview}
                            </p>



                            {/* Spacer */}
                            <div className="h-8" />

                            {/* Tap to Close Button */}
                            <div className="flex justify-center">
                                <button
                                    onClick={onClose}
                                    className="px-8 py-3 rounded-full border border-zinc-700 text-zinc-500 text-xs font-bold uppercase tracking-[0.2em] hover:border-zinc-500 hover:text-zinc-300 transition-colors duration-200"
                                >
                                    Tap to Close
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
