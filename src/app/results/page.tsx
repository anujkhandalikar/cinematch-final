"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Movie, MOVIES } from "@/lib/movies"
import { Button } from "@/components/ui/button"

import Image from "next/image"
import { Home, Share2 } from "lucide-react"

export default function ResultsPage() {
    const router = useRouter()
    const [likes, setLikes] = useState<Movie[]>([])

    useEffect(() => {
        const saved = sessionStorage.getItem("solo_results")
        if (saved) {
            const likedIds = JSON.parse(saved) as string[]
            const likedMovies = MOVIES.filter((m: Movie) => likedIds.includes(m.id))
            setLikes(likedMovies)
        }
    }, [])

    return (
        <div className="min-h-screen p-4 bg-black text-white dot-pattern overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/80 to-black pointer-events-none" />

            <div className="relative z-10 max-w-md mx-auto flex flex-col h-full min-h-screen">
                <header className="text-center space-y-4 pt-12 pb-8">
                    <span className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900/80 px-4 py-1.5 text-xs font-medium text-zinc-400 uppercase tracking-widest backdrop-blur-sm">
                        <span className="flex h-2 w-2 rounded-full bg-red-600 mr-2 animate-pulse"></span>
                        Mission Accomplished
                    </span>
                    <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">Your <span className="text-red-600">Shortlist</span></h1>
                    <p className="text-zinc-500 font-medium text-lg">
                        You liked <span className="text-white font-bold">{likes.length}</span> movies.
                    </p>
                </header>

                <div className="flex-1 space-y-4 overflow-y-auto pb-24 scrollbar-hide">
                    {likes.length === 0 ? (
                        <div className="text-center p-12 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
                            <p className="text-zinc-500 font-medium">No movies liked. Tough crowd!</p>
                        </div>
                    ) : (
                        likes.map((movie) => (
                            <div key={movie.id} className="group relative overflow-hidden flex flex-row h-36 bg-zinc-900/60 border border-zinc-800 rounded-2xl hover:bg-zinc-900 hover:scale-[1.02] transition-all duration-300">
                                <div className="relative w-28 h-full shrink-0">
                                    <Image
                                        src={movie.poster_url}
                                        alt={movie.title}
                                        fill
                                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-zinc-900/80" />
                                </div>
                                <div className="flex flex-col justify-center p-5 pl-2 w-full z-10">
                                    <h3 className="font-black text-xl uppercase tracking-tight leading-none mb-2 line-clamp-1 group-hover:text-red-500 transition-colors">{movie.title}</h3>
                                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">
                                        <span className="text-zinc-300">{movie.year}</span>
                                        <span>•</span>
                                        <span className="line-clamp-1">{movie.genre}</span>
                                    </div>
                                    <a
                                        href={`https://www.google.com/search?q=watch+${encodeURIComponent(movie.title)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center text-red-600 text-xs font-bold uppercase tracking-wider hover:text-red-500"
                                    >
                                        Watch Options <Share2 className="w-3 h-3 ml-1" />
                                    </a>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="fixed bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black via-black to-transparent z-20">
                    <div className="max-w-md mx-auto flex gap-4">
                        <Button
                            className="flex-1 h-14 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white font-bold uppercase tracking-wider rounded-full transition-all"
                            variant="outline"
                            onClick={() => router.push("/")}
                        >
                            <Home className="w-5 h-5 mr-2" /> Home
                        </Button>
                        <Button
                            className="flex-1 h-14 bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-wider rounded-full shadow-[0_0_20px_-5px_rgba(220,38,38,0.5)] transition-all"
                            onClick={() => alert("Sharing not implemented in MVP")}
                        >
                            <Share2 className="w-5 h-5 mr-2" /> Share List
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
