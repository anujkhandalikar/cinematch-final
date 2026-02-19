"use client"

import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion"
import Image from "next/image"
import { Movie } from "@/lib/movies"
import { useState } from "react"
import { X, Heart } from "lucide-react"

interface MovieCardProps {
    movie: Movie
    onSwipe: (direction: "left" | "right") => void
    index: number // Stack index to control z-index
}

export function MovieCard({ movie, onSwipe, index }: MovieCardProps) {
    const [exitX, setExitX] = useState<number | null>(null)
    const x = useMotionValue(0)
    const rotate = useTransform(x, [-200, 200], [-25, 25])
    const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0.5, 1, 1, 1, 0.5])

    // Color overlays for swipe feedback
    const rightOpacity = useTransform(x, [0, 150], [0, 0.5])
    const leftOpacity = useTransform(x, [-150, 0], [0.5, 0])

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (info.offset.x > 100) {
            setExitX(200)
            onSwipe("right")
        } else if (info.offset.x < -100) {
            setExitX(-200)
            onSwipe("left")
        }
    }

    // Only the top card (index 0) is interactive
    const isFront = index === 0

    return (
        <motion.div
            style={{
                width: "100%",
                maxWidth: "350px",
                height: "500px",
                position: "absolute",
                top: 0,
                x: isFront ? x : 0,
                rotate: isFront ? rotate : 0,
                opacity: isFront ? 1 : 1 - index * 0.05,
                zIndex: 100 - index,
                scale: 1 - index * 0.05,
                y: index * 15,
            }}
            drag={isFront ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={handleDragEnd}
            animate={exitX !== null ? { x: exitX * 2, opacity: 0 } : {}}
            transition={{ duration: 0.2 }}
            className="relative rounded-xl overflow-hidden shadow-xl bg-card border border-border cursor-grab active:cursor-grabbing"
        >
            {/* Swipe Feedback Overlay - RIGHT (Like) */}
            <motion.div
                style={{ opacity: rightOpacity }}
                className="absolute inset-0 bg-green-500/30 z-20 flex items-center justify-center pointer-events-none"
            >
                <Heart className="w-32 h-32 text-white fill-current" />
            </motion.div>

            {/* Swipe Feedback Overlay - LEFT (Pass) */}
            <motion.div
                style={{ opacity: leftOpacity }}
                className="absolute inset-0 bg-red-500/30 z-20 flex items-center justify-center pointer-events-none"
            >
                <X className="w-32 h-32 text-white" />
            </motion.div>

            {/* Movie Poster */}
            <div className="relative w-full h-full">
                <Image
                    src={movie.poster_url}
                    alt={movie.title}
                    fill
                    className="object-cover"
                    priority={index < 2} // Priority load top 2 cards
                    draggable={false}
                />

                {/* Gradient & Text Content */}
                <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6 pt-20 text-white">
                    <h2 className="text-2xl font-bold leading-tight shadow-black drop-shadow-md">
                        {movie.title}
                    </h2>
                    <div className="flex items-center gap-2 mt-2 text-sm font-medium text-gray-200">
                        <span className="bg-white/20 px-2 py-0.5 rounded backdrop-blur-sm">
                            {movie.year}
                        </span>
                        <span>•</span>
                        <span>{Array.isArray(movie.genre) ? movie.genre.join(', ') : movie.genre}</span>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
