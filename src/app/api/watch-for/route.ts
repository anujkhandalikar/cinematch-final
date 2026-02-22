import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? process.env.open_api_key });

export async function POST(req: NextRequest) {
    if (!process.env.OPENAI_API_KEY && !process.env.open_api_key) {
        return NextResponse.json(
            { error: "OpenAI API key missing" },
            { status: 500 }
        );
    }

    try {
        const body = await req.json();
        const { movies } = body;

        if (!movies || !Array.isArray(movies) || movies.length === 0) {
            return NextResponse.json(
                { error: "Invalid or empty movies array provided" },
                { status: 400 }
            );
        }

        // Limit the input to avoid huge payloads and unnecessary costs
        const limitedMovies = movies.slice(0, 15).map((m: any) => ({
            id: m.id,
            title: m.title,
            overview: m.overview || "No synopsis available",
        }));

        const prompt = `
For each of the following movies, provide EXACTLY ONE word (or a very short 2-3 word phrase maximum) describing the best element, theme, or reason to watch it. 

Be creative and insightful. Do not just repeat the genre. Use strong, exciting adjectives or nouns.
Examples: "Mind-Bending", "Stunning Visuals", "Heartbreaking", "Adrenaline", "Slow Burn", "Cozy", "Gritty Realism", "Laughs", "Nostalgia", "Pure Vibes", "Chaos".

Return ONLY a JSON object mapping the movie ID to the short phrase.
Example:
{
  "123": "Mind-Bending",
  "456": "Pure Vibes"
}

Movies:
${JSON.stringify(limitedMovies, null, 2)}
        `;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            temperature: 0.7, // slightly creative
            max_tokens: 300,
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "system",
                    content: "You are a movie expert AI. Provide exactly one strong, engaging word or short phrase describing why someone should watch the specific movie.",
                },
                { role: "user", content: prompt },
            ],
        });

        const raw = completion.choices[0].message.content || "{}";
        const result = JSON.parse(raw);

        return NextResponse.json({ watchFor: result });
    } catch (error) {
        console.error("Error in /api/watch-for:", error);
        return NextResponse.json(
            { error: "Failed to generate watch-for phrases" },
            { status: 500 }
        );
    }
}
