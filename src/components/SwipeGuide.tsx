"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useAnimation } from "framer-motion"
import { Heart, X } from "lucide-react"

const STORAGE_KEY = "cinematch_guide_seen"

type Phase = "idle" | "right" | "left" | "done"

interface SwipeGuideProps {
    /** If true, always show regardless of localStorage (used for ?guide=preview) */
    forceShow?: boolean
}

export function SwipeGuide({ forceShow = false }: SwipeGuideProps) {
    const [visible, setVisible] = useState(false)
    const [phase, setPhase] = useState<Phase>("idle")
    const cardControls = useAnimation()
    const didRun = useRef(false)

    useEffect(() => {
        if (didRun.current) return
        didRun.current = true

        if (!forceShow && typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY)) return

        setVisible(true)

        const run = async () => {
            await delay(400)

            // Swipe left (skip)
            setPhase("left")
            await cardControls.start({ x: -110, rotate: -11, transition: { duration: 0.65, ease: "easeInOut" } })
            await delay(500)

            // Snap back
            setPhase("idle")
            await cardControls.start({ x: 0, rotate: 0, transition: { duration: 0.3, ease: "easeOut" } })
            await delay(350)

            // Swipe right (like)
            setPhase("right")
            await cardControls.start({ x: 110, rotate: 11, transition: { duration: 0.65, ease: "easeInOut" } })
            await delay(500)

            // Snap back
            setPhase("idle")
            await cardControls.start({ x: 0, rotate: 0, transition: { duration: 0.3, ease: "easeOut" } })
            await delay(400)

            // Fade out
            setPhase("done")
            if (!forceShow) localStorage.setItem(STORAGE_KEY, "1")
            await delay(600)
            setVisible(false)
        }

        run()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [forceShow])

    if (!visible) return null

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === "done" ? 0 : 1 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm"
        >
            <div className="flex flex-col items-center gap-5 select-none">

                {/* Hint text */}
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                    How it works
                </p>

                {/* Demo card */}
                <div className="relative">
                    <motion.div
                        animate={cardControls}
                        className="relative w-[200px] h-[300px] rounded-3xl overflow-hidden shadow-2xl bg-zinc-900 border border-zinc-700"
                    >
                        {/* Fake poster background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-950" />

                        {/* Faint film-grain texture feel */}
                        <div className="absolute inset-0 opacity-10"
                            style={{
                                backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                                backgroundSize: "12px 12px",
                            }}
                        />

                        {/* Right (Like) overlay */}
                        <motion.div
                            animate={{ opacity: phase === "right" ? 1 : 0 }}
                            transition={{ duration: 0.25 }}
                            className="absolute inset-0 bg-green-500/30 z-10 flex items-center justify-center pointer-events-none"
                        >
                            <Heart className="w-16 h-16 text-white fill-current drop-shadow-lg" />
                        </motion.div>

                        {/* Left (Skip) overlay */}
                        <motion.div
                            animate={{ opacity: phase === "left" ? 1 : 0 }}
                            transition={{ duration: 0.25 }}
                            className="absolute inset-0 bg-red-600/30 z-10 flex items-center justify-center pointer-events-none"
                        >
                            <X className="w-16 h-16 text-white drop-shadow-lg" />
                        </motion.div>

                        {/* Placeholder card content */}
                        <div className="absolute bottom-0 w-full p-4 z-20">
                            <div className="h-1.5 w-12 bg-zinc-600 rounded-full mb-2.5" />
                            <div className="h-5 w-28 bg-zinc-500 rounded mb-1.5" />
                            <div className="h-3 w-20 bg-zinc-600 rounded mb-3" />
                            <div className="h-2.5 w-full bg-zinc-700 rounded-full mb-1" />
                            <div className="h-2.5 w-3/4 bg-zinc-700 rounded-full" />
                        </div>
                    </motion.div>

                    {/* Floating direction labels beside the card */}
                    <motion.div
                        animate={{ opacity: phase === "left" ? 1 : 0, x: phase === "left" ? 0 : 6 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-1/2 -translate-y-1/2 -left-24 flex flex-col items-center gap-1"
                    >
                        <div className="w-8 h-8 rounded-full bg-red-600/20 border border-red-600/40 flex items-center justify-center">
                            <X className="w-4 h-4 text-red-400" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Skip</span>
                    </motion.div>

                    <motion.div
                        animate={{ opacity: phase === "right" ? 1 : 0, x: phase === "right" ? 0 : -6 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-1/2 -translate-y-1/2 -right-24 flex flex-col items-center gap-1"
                    >
                        <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center">
                            <Heart className="w-4 h-4 text-green-400 fill-current" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-green-400">Like</span>
                    </motion.div>
                </div>

                {/* Bottom label */}
                <p className="text-zinc-400 text-xs font-semibold tracking-wide">
                    Swipe left to skip · Swipe right to like
                </p>
            </div>
        </motion.div>
    )
}

function delay(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms))
}
