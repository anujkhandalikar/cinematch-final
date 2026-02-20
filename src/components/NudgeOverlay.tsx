"use client"

import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle, ArrowRight, ListChecks } from "lucide-react"
import { Button } from "@/components/ui/button"
import { trackNudgeContinue, trackNudgeCheckShortlist } from "@/lib/analytics"

interface NudgeOverlayProps {
    show: boolean
    likedCount: number
    onContinue: () => void
    onCheckShortlist: () => void
}

export function NudgeOverlay({ show, likedCount, onContinue, onCheckShortlist }: NudgeOverlayProps) {
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
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/85 backdrop-blur-md"
                        onClick={onContinue}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300, delay: 0.1 }}
                        className="relative w-full max-w-sm z-10"
                    >
                        <div className="bg-zinc-900/90 border border-zinc-800 backdrop-blur-xl rounded-3xl p-8 shadow-2xl text-center space-y-6">
                            {/* Success Icon */}
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.2 }}
                                className="mx-auto w-20 h-20 rounded-full bg-red-600/20 border border-red-600/30 flex items-center justify-center"
                            >
                                <CheckCircle className="w-10 h-10 text-red-500" />
                            </motion.div>

                            {/* Text */}
                            <div className="space-y-2">
                                <h2 className="text-2xl font-black uppercase tracking-tight text-white">
                                    We've selected enough!
                                </h2>
                                <p className="text-zinc-400 text-sm font-medium">
                                    You've liked <span className="text-white font-bold">{likedCount}</span> movies so far.
                                    <br />
                                    Ready to see your shortlist?
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="space-y-3 pt-2">
                                <Button
                                    onClick={() => { trackNudgeCheckShortlist(likedCount); onCheckShortlist(); }}
                                    className="w-full h-14 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wider rounded-full shadow-[0_0_25px_-5px_rgba(220,38,38,0.5)] hover:shadow-[0_0_35px_-5px_rgba(220,38,38,0.6)] transition-all hover:scale-[1.02]"
                                >
                                    <ListChecks className="w-5 h-5 mr-2" />
                                    Check the Shortlist
                                </Button>

                                <Button
                                    onClick={() => { trackNudgeContinue(likedCount); onContinue(); }}
                                    variant="outline"
                                    className="w-full h-14 bg-transparent border border-zinc-700 hover:bg-zinc-800 text-zinc-300 hover:text-white font-bold uppercase tracking-wider rounded-full transition-all"
                                >
                                    Continue Swiping
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
