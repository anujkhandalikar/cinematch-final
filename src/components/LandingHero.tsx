'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowDown, Flame, Skull, Users, Clock, Play } from 'lucide-react';
import { trackLandingCTA } from '@/lib/analytics';

export default function LandingHero() {
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
                        The Cure for Choice Paralysis
                    </span>
                </motion.div>

                {/* Main Headline */}
                <motion.h1
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="text-5xl md:text-8xl font-black tracking-tighter uppercase leading-none"
                >
                    You&apos;re Wasting <br />
                    <span className="text-red-600">The Night.</span>
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="max-w-xl text-zinc-400 text-lg md:text-xl font-medium leading-relaxed"
                >
                    An average person/couple spends <span className="text-white font-bold">25 minutes</span> just scrolling <br className="hidden md:block" />
                    for a movie. We solve it in <span className="text-white font-bold">180 seconds.</span>
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="flex flex-col sm:flex-row gap-4 pt-4"
                >
                    <Link href="/lobby" onClick={() => trackLandingCTA("kill_the_scroll")}>
                        <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white font-bold text-base px-8 py-6 rounded-full uppercase tracking-wider shadow-[0_0_30px_-10px_rgba(220,38,38,0.5)] transition-all hover:scale-105">
                            Kill The Scroll <ArrowDown className="ml-2 h-4 w-4 -rotate-90" />
                        </Button>
                    </Link>
                    <Link href="#how-it-works" onClick={() => trackLandingCTA("how_it_works")}>
                        <Button variant="outline" size="lg" className="border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-900 hover:text-white font-bold text-base px-8 py-6 rounded-full uppercase tracking-wider">
                            How it works <ArrowDown className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </motion.div>
            </div>

            {/* Problem/Solution Grid */}
            <div className="relative z-10 container px-4 md:px-6 py-24">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FeatureCard
                        icon={<Skull className="w-5 h-5 text-red-600" />}
                        title="The Death of Fun"
                        desc="Infinite choice is a trap. By the time you find a movie, the mood is gone, your popcorn is cold, and the night is over."
                        delay={0.4}
                    />
                    <FeatureCard
                        icon={<Clock className="w-5 h-5 text-zinc-400" />}
                        title="The 180s Fuse"
                        desc="We force a decision. You have 3 minutes to swipe through a curated deck. If you don't pick, we choose the best match for you."
                        delay={0.5}
                    />
                    <FeatureCard
                        icon={<Users className="w-5 h-5 text-zinc-400" />}
                        title="Real-Time Sync"
                        desc="Duo Mode kills the 'I don't know, you pick' loop. As soon as you and your partner both swipe right, the movie starts."
                        delay={0.6}
                    />
                </div>
            </div>

            {/* "The Protocol" Section */}
            <div className="relative z-10 container px-4 md:px-6 py-24 flex flex-col items-center space-y-16" id="how-it-works">
                <div className="text-center space-y-4">
                    <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">The Protocol</h2>
                    <p className="text-zinc-500 font-medium">Three steps to the credits.</p>
                </div>

                {/* Step 01 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full max-w-5xl items-center">
                    <div className="order-2 md:order-1 space-y-6">
                        <div className="text-8xl font-black text-red-900/20 leading-none">01</div>
                        <h3 className="text-3xl font-bold uppercase tracking-wide">Set The Vibe</h3>
                        <p className="text-zinc-400 leading-relaxed max-w-md">
                            Select your streaming services and genres. We filter the noise so you only see what you can actually watch right now.
                        </p>
                    </div>
                    <div className="order-1 md:order-2 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 h-80 flex items-center justify-center relative overflow-hidden group">
                        {/* Abstract UI Representation */}
                        <div className="grid grid-cols-2 gap-3 w-full max-w-xs opacity-50 group-hover:opacity-100 transition-opacity duration-500">
                            {['Netflix', 'Max', 'Hulu', 'Peacock'].map((service) => (
                                <div key={service} className="bg-zinc-800 rounded-lg p-4 text-center text-xs font-bold text-zinc-500 uppercase tracking-wider border border-zinc-700">
                                    {service}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Step 02 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full max-w-5xl items-center pt-12">
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 h-80 flex items-center justify-center relative overflow-hidden">
                        {/* Swipe Cards UI */}
                        <div className="relative w-40 h-56">
                            <div className="absolute inset-0 bg-zinc-800 rounded-xl border border-zinc-700 transform -rotate-6 scale-95 opacity-50"></div>
                            <div className="absolute inset-0 bg-zinc-900 rounded-xl border border-zinc-700 flex items-center justify-center">
                                <Play className="w-12 h-12 text-zinc-700 fill-current" />
                            </div>
                            {/* Heart Overlay */}
                            <div className="absolute bottom-4 right-4">
                                <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center shadow-lg shadow-red-900/50">
                                    <Flame className="w-5 h-5 text-white fill-current" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div className="text-8xl font-black text-red-900/20 leading-none">02</div>
                        <h3 className="text-3xl font-bold uppercase tracking-wide">The Fuse Swiping</h3>
                        <p className="text-zinc-400 leading-relaxed max-w-md">
                            The 3-minute timer starts. Swipe right on movies you like. In Duo mode, we track matches in real-time.
                        </p>
                    </div>
                </div>

                {/* Step 03 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full max-w-5xl items-center pt-12">
                    <div className="order-2 md:order-1 space-y-6">
                        <div className="text-8xl font-black text-red-900/20 leading-none">03</div>
                        <h3 className="text-3xl font-bold uppercase tracking-wide">It&apos;s A Match</h3>
                        <p className="text-zinc-400 leading-relaxed max-w-md">
                            We show you the winning movie and exactly where to stream it. No more arguments. Just press play.
                        </p>
                    </div>
                    <div className="order-1 md:order-2 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 h-80 flex items-center justify-center relative overflow-hidden">
                        {/* Match UI */}
                        <div className="relative w-full max-w-xs space-y-4">
                            <div className="flex items-center space-x-4 bg-zinc-800 p-4 rounded-xl border border-zinc-700">
                                <div className="w-12 h-16 bg-zinc-900 rounded-md shrink-0"></div>
                                <div className="space-y-2 w-full">
                                    <div className="h-4 bg-zinc-700 rounded w-3/4"></div>
                                    <div className="h-3 bg-zinc-700/50 rounded w-1/2"></div>
                                </div>
                            </div>
                            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-red-600/20 blur-3xl rounded-full pointer-events-none"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer tagline */}
            <div className="py-12 text-zinc-700 text-xs font-bold tracking-[0.3em] uppercase opacity-50">
                Cinematch © 2026 - End Choice Paralysis.
            </div>
        </div>
    );
}

function FeatureCard({ icon, title, desc, delay }: { icon: React.ReactNode, title: string, desc: string, delay: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: delay }}
            className="group flex flex-col space-y-4 p-8 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 hover:border-zinc-700 hover:bg-zinc-900/80 transition-all duration-300"
        >
            <div className="p-3 w-fit rounded-xl bg-zinc-950 border border-zinc-800 group-hover:border-zinc-700 transition-colors">
                {icon}
            </div>
            <div>
                <h3 className="font-black text-lg md:text-xl uppercase tracking-wide mb-2">{title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{desc}</p>
            </div>
        </motion.div>
    );
}
