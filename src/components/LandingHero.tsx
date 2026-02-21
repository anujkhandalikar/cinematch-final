'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowDown, Flame, Play } from 'lucide-react';
import { trackLandingCTA } from '@/lib/analytics';

const HOW_IT_WORKS = {
    solo: {
        subtitle: 'Three steps. One movie.',
        steps: [
            {
                title: 'Filter Your Platforms',
                description: 'Pick the services you own—Netflix, Prime Video, or HBO—to see only what\'s available to stream.',
            },
            {
                title: 'One Choice at a Time',
                description: 'Stop the endless scrolling. We show you exactly one movie at a time so you only have to make a simple "Yes" or "No" decision.',
            },
            {
                title: 'Decide with a Nudge',
                description: 'Once you hit 3 likes, we\'ll nudge you to check your shortlist. You can dive straight into a movie or keep swiping if you\'re still looking for "the one".',
            },
        ],
    },
    duo: {
        subtitle: 'Three steps. Zero arguments.',
        steps: [
            {
                title: 'Sync Your Vibes',
                description: 'Both of you select your platforms and genres to ensure the recommendations hit the spot for everyone.',
            },
            {
                title: 'Swipe Together',
                description: 'We show you the same movies, one by one. A title only makes the cut if both of you swipe right—solving the "what should we watch" debate instantly.',
            },
            {
                title: 'The Shortlist Nudge',
                description: 'As soon as you hit 3 mutual matches, we\'ll suggest it\'s time to watch. Take a look at your shared finalists or keep swiping to find more options together.',
            },
        ],
    },
};

export default function LandingHero() {
    const [mode, setMode] = useState<'solo' | 'duo'>('solo');
    return (
        <div className="relative min-h-screen flex flex-col items-center bg-black text-white dot-pattern">
            {/* Background Gradient */}
            <div className="fixed inset-0 bg-gradient-to-b from-transparent via-black/80 to-black pointer-events-none z-0" />

            {/* Initial Hero Section */}
            <div className="relative z-10 container px-4 md:px-6 pt-32 pb-16 flex flex-col items-center text-center space-y-8">

                {/* Top Badge */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4"
                >
                    <span className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900/80 px-4 py-1.5 text-xs font-medium text-zinc-400 uppercase tracking-widest backdrop-blur-sm">
                        <Flame className="w-3 h-3 text-red-600 mr-2" />
                        Stop Scrolling. Start Watching.
                    </span>
                </motion.div>

                {/* Main Headline */}
                <motion.h1
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="text-5xl md:text-8xl font-black tracking-tighter uppercase leading-none italic"
                >
                    Pick a Movie. <br />
                    <span className="text-red-600">Not a Fight.</span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="max-w-xl text-zinc-400 text-lg md:text-xl font-medium leading-relaxed"
                >
                    Decisions, simplified<br />
                    Based on <a href="https://drive.google.com/file/d/1tDLNhn8A9PWnxelA1sJxlSGup9brrfTp/view?usp=sharing" target="_blank" rel="noopener noreferrer" className="text-red-500 underline underline-offset-2 hover:text-red-400 transition-colors">research</a>.
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="flex flex-col sm:flex-row gap-4 pt-4"
                >
                    <Link href="/lobby" onClick={() => trackLandingCTA("kill_the_scroll")}>
                        <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white font-black text-base px-8 py-6 rounded-full uppercase tracking-tighter italic shadow-[0_0_30px_-10px_rgba(220,38,38,0.5)] transition-all hover:scale-105">
                            Start Swiping <ArrowDown className="ml-2 h-4 w-4 -rotate-90" />
                        </Button>
                    </Link>
                </motion.div>
            </div>

            {/* How It Works Section */}
            <div className="relative z-10 container px-4 md:px-6 py-24 flex flex-col items-center space-y-12" id="how-it-works">
                <div className="text-center space-y-6">
                    <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">How It Works</h2>

                    {/* Mode toggle pill */}
                    <div className="flex items-center justify-center">
                        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-full p-1">
                            <button
                                onClick={() => setMode('solo')}
                                className={`px-5 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider transition-all duration-300 ${
                                    mode === 'solo'
                                        ? 'bg-red-600 text-white shadow-lg shadow-red-900/40'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                Solo
                            </button>
                            <button
                                onClick={() => setMode('duo')}
                                className={`px-5 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider transition-all duration-300 ${
                                    mode === 'duo'
                                        ? 'bg-red-600 text-white shadow-lg shadow-red-900/40'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                Duo
                            </button>
                        </div>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.p
                            key={mode}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.2 }}
                            className="text-zinc-500 font-medium"
                        >
                            {HOW_IT_WORKS[mode].subtitle}
                        </motion.p>
                    </AnimatePresence>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={mode}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{ duration: 0.25 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl"
                    >
                        {/* Step 01 */}
                        <div className="flex flex-col items-center text-center space-y-5">
                            <div className="bg-zinc-900/50 rounded-2xl p-6 h-48 w-full flex items-center justify-center relative overflow-hidden group">
                                <div className="grid grid-cols-2 gap-2 w-full max-w-[10rem] opacity-50 group-hover:opacity-100 transition-opacity duration-500">
                                    {['Netflix', 'Max', 'Hulu', 'Peacock'].map((service) => (
                                        <div key={service} className="bg-zinc-800 rounded-lg p-2.5 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-wider border border-zinc-700">
                                            {service}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="text-5xl font-black text-red-900/20 leading-none">01</div>
                            <h3 className="text-xl font-bold uppercase tracking-wide">{HOW_IT_WORKS[mode].steps[0].title}</h3>
                            <p className="text-zinc-400 text-sm leading-relaxed max-w-xs">
                                {HOW_IT_WORKS[mode].steps[0].description}
                            </p>
                        </div>

                        {/* Step 02 */}
                        <div className="flex flex-col items-center text-center space-y-5">
                            <div className="bg-zinc-900/50 rounded-2xl p-6 h-48 w-full flex items-center justify-center relative overflow-hidden">
                                <div className="relative w-24 h-36">
                                    <div className="absolute inset-0 bg-zinc-800 rounded-xl border border-zinc-700 transform -rotate-6 scale-95 opacity-50"></div>
                                    <div className="absolute inset-0 bg-zinc-900 rounded-xl border border-zinc-700 flex items-center justify-center">
                                        <Play className="w-8 h-8 text-zinc-700 fill-current" />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1">
                                        <div className="w-7 h-7 bg-red-600 rounded-full flex items-center justify-center shadow-lg shadow-red-900/50">
                                            <Flame className="w-3.5 h-3.5 text-white fill-current" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="text-5xl font-black text-red-900/20 leading-none">02</div>
                            <h3 className="text-xl font-bold uppercase tracking-wide">{HOW_IT_WORKS[mode].steps[1].title}</h3>
                            <p className="text-zinc-400 text-sm leading-relaxed max-w-xs">
                                {HOW_IT_WORKS[mode].steps[1].description}
                            </p>
                        </div>

                        {/* Step 03 */}
                        <div className="flex flex-col items-center text-center space-y-5">
                            <div className="bg-zinc-900/50 rounded-2xl p-6 h-48 w-full flex items-center justify-center relative overflow-hidden">
                                <div className="relative w-full max-w-[10rem] space-y-3">
                                    <div className="flex items-center space-x-3 bg-zinc-800 p-3 rounded-xl border border-zinc-700">
                                        <div className="w-8 h-11 bg-zinc-900 rounded-md shrink-0"></div>
                                        <div className="space-y-1.5 w-full">
                                            <div className="h-3 bg-zinc-700 rounded w-3/4"></div>
                                            <div className="h-2 bg-zinc-700/50 rounded w-1/2"></div>
                                        </div>
                                    </div>
                                    <div className="absolute -right-3 -bottom-3 w-16 h-16 bg-red-600/20 blur-3xl rounded-full pointer-events-none"></div>
                                </div>
                            </div>
                            <div className="text-5xl font-black text-red-900/20 leading-none">03</div>
                            <h3 className="text-xl font-bold uppercase tracking-wide">{HOW_IT_WORKS[mode].steps[2].title}</h3>
                            <p className="text-zinc-400 text-sm leading-relaxed max-w-xs">
                                {HOW_IT_WORKS[mode].steps[2].description}
                            </p>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Footer tagline */}
            <div className="relative z-10 py-12 text-zinc-700 text-xs font-bold tracking-[0.3em] uppercase opacity-50">
                Cinematch © 2026
            </div>
            <div className="relative z-10 pb-10 text-zinc-400 text-sm tracking-wide">
                Built with ❤️ by <a href="https://anujk.in" target="_blank" rel="noopener noreferrer" className="text-zinc-300 underline underline-offset-2 hover:text-white transition-colors">Anuj</a>
            </div>
        </div>
    );
}
