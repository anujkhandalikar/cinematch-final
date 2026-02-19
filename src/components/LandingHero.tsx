'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Film, Users, Zap } from 'lucide-react';

export default function LandingHero() {
    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-background text-foreground dot-pattern">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background pointer-events-none" />

            {/* Floating Elements (Decorative) */}
            <FloatingCard
                className="absolute top-1/4 -left-12 rotate-[-12deg] w-48 h-72 bg-zinc-800 border border-zinc-700 hidden md:block opacity-20"
                delay={0}
            />
            <FloatingCard
                className="absolute bottom-1/4 -right-12 rotate-[12deg] w-48 h-72 bg-zinc-800 border border-zinc-700 hidden md:block opacity-20"
                delay={1}
            />

            <div className="relative z-10 container px-4 md:px-6 flex flex-col items-center text-center space-y-8">

                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1 text-sm text-zinc-400 backdrop-blur-md"
                >
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                    MVP v1.0 Live
                </motion.div>

                {/* Hero Title */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="text-4xl md:text-7xl font-extrabold tracking-tight"
                >
                    Stop Scrolling. <br className="hidden md:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
                        Start Watching.
                    </span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="max-w-[600px] text-zinc-400 md:text-xl"
                >
                    Choice paralysis ends here. Swipe through a curated stack of movies alone or with a partner.
                    Match in 3 minutes or less.
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="flex flex-col sm:flex-row gap-4 w-full justify-center"
                >
                    <Link href="/lobby">
                        <Button size="lg" className="w-full sm:w-auto text-lg h-12 bg-white text-black hover:bg-zinc-200">
                            Enter CineMatch <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </Link>
                    <Link href="#how-it-works">
                        <Button variant="outline" size="lg" className="w-full sm:w-auto text-lg h-12 border-zinc-800 hover:bg-zinc-900">
                            How it works
                        </Button>
                    </Link>
                </motion.div>

                {/* Feature Grid (Mini) */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 text-left w-full max-w-4xl"
                >
                    <Feature
                        icon={<Zap className="h-6 w-6 text-yellow-500" />}
                        title="3-Minute Timer"
                        desc="Hard time limit creates focus. No more 45-minute browsing sessions."
                    />
                    <Feature
                        icon={<Users className="h-6 w-6 text-pink-500" />}
                        title="Dual Mode"
                        desc="Sync up with a partner. Swipe together in real-time."
                    />
                    <Feature
                        icon={<Film className="h-6 w-6 text-indigo-500" />}
                        title="Curated Cuts"
                        desc="No junk. Only high-quality movies organized by vibe."
                    />
                </motion.div>
            </div>
        </div>
    );
}

function FloatingCard({ className, delay }: { className?: string, delay: number }) {
    return (
        <motion.div
            className={`rounded-xl shadow-2xl ${className}`}
            animate={{
                y: [0, -20, 0],
                rotate: [0, 5, 0]
            }}
            transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: delay
            }}
        />
    );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
    return (
        <div className="flex flex-col space-y-2 p-4 rounded-lg hover:bg-zinc-900/50 transition-colors border border-transparent hover:border-zinc-800">
            <div className="p-2 w-fit rounded-md bg-zinc-900 border border-zinc-800">
                {icon}
            </div>
            <h3 className="font-bold text-lg">{title}</h3>
            <p className="text-zinc-400 text-sm leading-relaxed">{desc}</p>
        </div>
    );
}
