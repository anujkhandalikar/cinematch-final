"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Movie, MOVIES } from "@/lib/movies"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
        <div className="min-h-screen p-4 bg-background max-w-md mx-auto space-y-6">
            <header className="text-center space-y-2 pt-8">
                <h1 className="text-3xl font-bold">Your Shortlist</h1>
                <p className="text-muted-foreground">
                    You liked {likes.length} movies.
                </p>
            </header>

            <div className="grid grid-cols-1 gap-4">
                {likes.length === 0 ? (
                    <div className="text-center p-8 border border-dashed rounded-lg bg-card/50">
                        <p className="text-muted-foreground">No movies liked. Tough crowd!</p>
                    </div>
                ) : (
                    likes.map((movie) => (
                        <Card key={movie.id} className="overflow-hidden flex flex-row h-32">
                            <div className="relative w-24 h-full shrink-0">
                                <Image
                                    src={movie.poster_url}
                                    alt={movie.title}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <CardContent className="flex flex-col justify-center p-4">
                                <h3 className="font-bold line-clamp-1">{movie.title}</h3>
                                <p className="text-sm text-muted-foreground">{movie.year} • {movie.genre}</p>
                                <a
                                    href={`https://www.google.com/search?q=watch+${encodeURIComponent(movie.title)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary text-xs mt-2 underline"
                                >
                                    Watch options
                                </a>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            <div className="flex gap-4 sticky bottom-4">
                <Button className="flex-1 gap-2" variant="outline" onClick={() => router.push("/")}>
                    <Home className="w-4 h-4" /> Home
                </Button>
                <Button className="flex-1 gap-2" onClick={() => alert("Sharing not implemented in MVP")}>
                    <Share2 className="w-4 h-4" /> Share
                </Button>
            </div>
        </div>
    )
}
