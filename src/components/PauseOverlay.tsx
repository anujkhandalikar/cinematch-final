"use client"

import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle } from "lucide-react"

interface PauseOverlayProps {
    show: boolean
    matchCount?: number
}

export function PauseOverlay({ show, matchCount }: PauseOverlayProps) {
    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                >
                    <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300, delay: 0.1 }}
                        className="relative z-10 w-full max-w-sm"
                    >
                        <div className="bg-zinc-900/90 border border-zinc-800 backdrop-blur-xl rounded-3xl p-8 shadow-2xl text-center space-y-6">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.2 }}
                                className="mx-auto w-20 h-20 rounded-full bg-red-600/20 border border-red-600/30 flex items-center justify-center"
                            >
                                <CheckCircle className="w-10 h-10 text-red-500" />
                            </motion.div>

                            <div className="space-y-2">
                                <h2 className="text-2xl font-black uppercase tracking-tight text-white">
                                    Mutual match found!
                                </h2>
                                <p className="text-zinc-400 text-sm font-medium">
                                    You&apos;ve found {matchCount ?? 3} movies you both like!
                                    <br />
                                    The host is deciding whether to continue or view the shortlist.
                                </p>
                            </div>

                            <div className="flex items-center justify-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-widest">
                                <span className="flex h-2 w-2 rounded-full bg-red-600 animate-pulse"></span>
                                Waiting for host
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
