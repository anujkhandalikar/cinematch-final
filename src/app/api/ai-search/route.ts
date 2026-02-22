import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import type { Movie, Mood } from "@/lib/movies"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? process.env.open_api_key })

const TMDB_BASE = "https://api.themoviedb.org/3"
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"

const GENRE_NAME_TO_ID: Record<string, number> = {
    Action: 28,
    Adventure: 12,
    Animation: 16,
    Comedy: 35,
    Crime: 80,
    Documentary: 99,
    Drama: 18,
    Family: 10751,
    Fantasy: 14,
    History: 36,
    Horror: 27,
    Music: 10402,
    Mystery: 9648,
    Romance: 10749,
    "Science Fiction": 878,
    Thriller: 53,
    War: 10752,
    Western: 37,
}

const GENRE_ID_TO_NAME: Record<number, string> = Object.fromEntries(
    Object.entries(GENRE_NAME_TO_ID).map(([name, id]) => [id, name])
)

// Language keyword → ISO 639-1 code
const LANGUAGE_KEYWORDS: Record<string, string> = {
    bollywood: "hi", hindi: "hi", "hindi film": "hi",
    korean: "ko", "k-drama": "ko", "kdrama": "ko",
    french: "fr",
    japanese: "ja", anime: "ja",
    spanish: "es",
    tamil: "ta",
    telugu: "te",
    marathi: "mr",
    punjabi: "pa",
    chinese: "zh",
}

// Genre keyword → canonical TMDB genre name
const GENRE_KEYWORDS: Record<string, string> = {
    thriller: "Thriller", thrillers: "Thriller",
    comedy: "Comedy", comedies: "Comedy", funny: "Comedy",
    horror: "Horror",
    romance: "Romance", romantic: "Romance",
    action: "Action",
    drama: "Drama",
    "sci-fi": "Science Fiction", "science fiction": "Science Fiction", scifi: "Science Fiction",
    animation: "Animation", animated: "Animation",
    documentary: "Documentary",
    mystery: "Mystery",
    adventure: "Adventure",
    family: "Family",
    fantasy: "Fantasy",
    crime: "Crime",
    war: "War",
    western: "Western",
    musical: "Music", music: "Music",
}

type YearRange = { start: number; end: number }

type ParsedQuery = {
    raw: string
    tokens: string[]
    year?: number
    yearRange?: YearRange
    language?: string
    region?: string
    includeGenres?: string[]
    excludeGenres?: string[]
    moodTags?: string[]
    intent: {
        top?: boolean
        latest?: boolean
        award?: boolean
    }
    titleCandidate?: string
    subjective?: boolean
}

type LlmExtract = {
    title?: string | null
    keywords?: string[]
    year?: number | null
    yearRange?: YearRange | null
    language?: string | null
    region?: string | null
    includeGenres?: string[]
    excludeGenres?: string[]
    moodTags?: string[]
    intent?: {
        top?: boolean
        latest?: boolean
        award?: boolean
    }
}

interface TmdbMovie {
    id: number
    title: string
    poster_path: string | null
    genre_ids: number[]
    release_date: string
    overview: string
    vote_average: number
}

const INTENT_KEYWORDS = new Set([
    "top",
    "most",
    "topmost",
    "best",
    "highest",
    "rated",
    "rating",
    "imdb",
    "top-rated",
    "toprated",
    "critically",
])

const LATEST_KEYWORDS = new Set([
    "latest",
    "new",
    "recent",
    "fresh",
    "trending",
    "viral",
])

const AWARD_KEYWORDS = new Set([
    "oscar",
    "oscars",
    "award",
    "awards",
    "best-picture",
    "best picture",
])

const TITLE_HINTS = ["title:", "titled", "called", "named", "\"", "'"]

const SUBJECTIVE_KEYWORDS = new Set([
    "feel-good",
    "feel good",
    "cozy",
    "chill",
    "comfort",
    "vibes",
    "vibe",
    "easy",
    "light",
    "fun",
    "uplifting",
    "wholesome",
    "gritty",
    "bittersweet",
    "slow-burn",
    "slow burn",
    "mind-bending",
    "mind bending",
    "dark",
    "intense",
    "romantic",
    "family",
    "scary",
    "sad",
    "emotional",
    "tearjerker",
    "tear jerker",
    "heartbreaking",
    "tragic",
    "melancholic",
    "melancholy",
    "somber",
    "weepy",
    "depressing",
    "nostalgic",
    "anxious",
    "tense",
    "hopeful",
    "optimistic",
    "lonely",
    "isolation",
    "healing",
    "cathartic",
    "angry",
    "rage",
    "revenge",
    "vengeful",
    "mysterious",
    "eerie",
    "whimsical",
    "quirky",
    "absurd",
    "surreal",
    "inspiring",
    "motivational",
    "heartwarming",
    "comforting",
    "soothing",
    "dark comedy",
    "epic",
    "grand",
    "sweeping",
    "suspenseful",
    "edge-of-seat",
    "edge of seat",
    "contemplative",
    "thoughtful",
    "reflective",
    "tragic romance",
])

const GENERIC_WORDS = new Set([
    "movie",
    "movies",
    "film",
    "films",
    "cinema",
    "watch",
    "watching",
    "show",
    "shows",
    "most",
    "topmost",
    "volume",
    "part",
    "episode",
    "chapter",
    "right",
])

const LANGUAGE_TO_REGION: Record<string, string> = {
    hi: "IN",
    ta: "IN",
    te: "IN",
    mr: "IN",
    pa: "IN",
    ko: "KR",
    ja: "JP",
    zh: "CN",
    fr: "FR",
    es: "ES",
}

type MoodRule = {
    include: string[]
    exclude: string[]
    keywords: string[]
}

const MOOD_RULES: Record<string, MoodRule> = {
    feel_good: {
        include: ["Comedy", "Family", "Romance", "Animation", "Music"],
        exclude: ["Horror", "Thriller", "Crime", "War"],
        keywords: ["feel good", "uplifting", "heartwarming", "joy", "hope", "inspiring"],
    },
    cozy: {
        include: ["Family", "Romance", "Comedy"],
        exclude: ["Horror", "Thriller", "War"],
        keywords: ["cozy", "comfort", "warm", "gentle"],
    },
    wholesome: {
        include: ["Family", "Comedy", "Romance"],
        exclude: ["Horror", "Crime", "Thriller"],
        keywords: ["wholesome", "kind", "sweet"],
    },
    gritty: {
        include: ["Crime", "Thriller", "Drama"],
        exclude: ["Family", "Animation"],
        keywords: ["gritty", "raw", "dark"],
    },
    dark: {
        include: ["Thriller", "Crime", "Horror", "Mystery"],
        exclude: ["Family"],
        keywords: ["dark", "bleak", "grim"],
    },
    intense: {
        include: ["Thriller", "Action", "Crime", "War"],
        exclude: ["Family"],
        keywords: ["intense", "edge of your seat", "tense"],
    },
    romantic: {
        include: ["Romance", "Drama", "Comedy"],
        exclude: ["Horror"],
        keywords: ["romantic", "love", "relationship"],
    },
    family: {
        include: ["Family", "Animation", "Comedy"],
        exclude: ["Horror", "Thriller"],
        keywords: ["family", "kids", "children"],
    },
    scary: {
        include: ["Horror", "Thriller", "Mystery"],
        exclude: ["Family"],
        keywords: ["scary", "horror", "frightening"],
    },
    bittersweet: {
        include: ["Drama", "Romance"],
        exclude: ["Horror"],
        keywords: ["bittersweet", "poignant", "melancholy"],
    },
    sad: {
        include: ["Drama", "Romance", "Music"],
        exclude: ["Comedy", "Action", "Horror"],
        keywords: ["sad", "heartbreaking", "tragic", "melancholy", "grief", "loss", "tearjerker"],
    },
    nostalgic: {
        include: ["Drama", "Romance", "Comedy"],
        exclude: ["Horror"],
        keywords: ["nostalgic", "memory", "past", "reminisce"],
    },
    anxious: {
        include: ["Thriller", "Mystery", "Crime", "Drama"],
        exclude: ["Family", "Comedy"],
        keywords: ["anxious", "panic", "uneasy", "paranoia"],
    },
    tense: {
        include: ["Thriller", "Mystery", "Crime"],
        exclude: ["Family", "Comedy"],
        keywords: ["tense", "pressure", "tension"],
    },
    hopeful: {
        include: ["Drama", "Family", "Comedy"],
        exclude: ["Horror", "Crime"],
        keywords: ["hopeful", "optimistic", "hope"],
    },
    optimistic: {
        include: ["Drama", "Family", "Comedy"],
        exclude: ["Horror", "Crime"],
        keywords: ["optimistic", "positive", "bright"],
    },
    lonely: {
        include: ["Drama", "Romance"],
        exclude: ["Comedy"],
        keywords: ["lonely", "isolation", "solitude"],
    },
    healing: {
        include: ["Drama", "Romance"],
        exclude: ["Horror", "Thriller"],
        keywords: ["healing", "recovery", "cathartic"],
    },
    cathartic: {
        include: ["Drama", "Romance"],
        exclude: ["Horror", "Thriller"],
        keywords: ["cathartic", "release", "emotional"],
    },
    angry: {
        include: ["Action", "Crime", "Thriller", "Drama"],
        exclude: ["Family"],
        keywords: ["angry", "rage", "fury"],
    },
    revenge: {
        include: ["Action", "Crime", "Thriller", "Drama"],
        exclude: ["Family"],
        keywords: ["revenge", "vengeful", "vengeance", "payback"],
    },
    mysterious: {
        include: ["Mystery", "Thriller", "Horror"],
        exclude: ["Family", "Comedy"],
        keywords: ["mysterious", "enigmatic", "eerie"],
    },
    eerie: {
        include: ["Horror", "Mystery", "Thriller"],
        exclude: ["Family"],
        keywords: ["eerie", "creepy", "unsettling"],
    },
    whimsical: {
        include: ["Comedy", "Family", "Fantasy", "Animation"],
        exclude: ["Horror", "War"],
        keywords: ["whimsical", "quirky", "playful"],
    },
    absurd: {
        include: ["Comedy", "Fantasy", "Science Fiction"],
        exclude: ["Horror"],
        keywords: ["absurd", "surreal", "nonsense"],
    },
    inspiring: {
        include: ["Drama", "Family", "Music"],
        exclude: ["Horror", "Crime"],
        keywords: ["inspiring", "motivational", "triumph"],
    },
    heartwarming: {
        include: ["Family", "Romance", "Comedy", "Drama"],
        exclude: ["Horror", "Crime"],
        keywords: ["heartwarming", "sweet", "warming"],
    },
    comforting: {
        include: ["Family", "Romance", "Comedy"],
        exclude: ["Horror", "Thriller"],
        keywords: ["comforting", "soothing", "gentle"],
    },
    dark_comedy: {
        include: ["Comedy", "Crime", "Thriller", "Drama"],
        exclude: ["Family"],
        keywords: ["dark comedy", "black comedy", "morbid"],
    },
    epic: {
        include: ["Adventure", "Action", "Drama", "Fantasy", "War"],
        exclude: ["Horror"],
        keywords: ["epic", "grand", "sweeping", "saga"],
    },
    suspenseful: {
        include: ["Thriller", "Mystery", "Crime"],
        exclude: ["Family", "Comedy"],
        keywords: ["suspenseful", "edge of seat", "edge-of-seat"],
    },
    contemplative: {
        include: ["Drama", "Romance"],
        exclude: ["Horror", "Action", "Thriller"],
        keywords: ["contemplative", "thoughtful", "reflective"],
    },
    romantic_tragic: {
        include: ["Romance", "Drama"],
        exclude: ["Comedy", "Horror"],
        keywords: ["tragic romance", "star-crossed", "heartbreak"],
    },
    slow_burn: {
        include: ["Drama", "Thriller", "Mystery"],
        exclude: ["Family"],
        keywords: ["slow burn", "slow-burn", "atmospheric"],
    },
    mind_bending: {
        include: ["Science Fiction", "Mystery", "Thriller"],
        exclude: ["Family"],
        keywords: ["mind-bending", "mind bending", "twist", "surreal"],
    },
    uplifting: {
        include: ["Drama", "Comedy", "Family"],
        exclude: ["Horror", "Crime"],
        keywords: ["uplifting", "inspiring", "hope"],
    },
}

const MOOD_EXPANSIONS: Record<string, string[]> = {
    feel_good: ["uplifting", "wholesome", "cozy"],
    dark: ["gritty", "intense", "mind_bending"],
    scary: ["dark", "intense"],
    romantic: ["bittersweet"],
    gritty: ["intense"],
    mind_bending: ["intense"],
    cozy: ["wholesome"],
    family: ["wholesome"],
    sad: ["bittersweet"],
    nostalgic: ["bittersweet"],
    anxious: ["tense", "intense"],
    tense: ["intense"],
    hopeful: ["uplifting"],
    optimistic: ["uplifting"],
    lonely: ["bittersweet"],
    healing: ["bittersweet"],
    cathartic: ["bittersweet"],
    angry: ["intense"],
    revenge: ["intense"],
    mysterious: ["mind_bending", "eerie"],
    eerie: ["dark"],
    whimsical: ["cozy"],
    absurd: ["mind_bending"],
    inspiring: ["uplifting"],
    heartwarming: ["wholesome"],
    comforting: ["cozy"],
    dark_comedy: ["gritty"],
    epic: ["intense"],
    suspenseful: ["intense"],
    contemplative: ["bittersweet"],
    romantic_tragic: ["bittersweet"],
}

const GENRE_TO_MOODS: Record<string, string[]> = {
    Thriller: ["intense", "gritty", "mind_bending"],
    Horror: ["scary", "dark", "intense"],
    Comedy: ["feel_good", "uplifting", "cozy"],
    Romance: ["romantic", "bittersweet"],
    Family: ["family", "wholesome"],
    Animation: ["family", "wholesome"],
    "Science Fiction": ["mind_bending", "intense"],
    Crime: ["gritty", "dark"],
    Mystery: ["mind_bending", "slow_burn"],
    Drama: ["bittersweet", "uplifting"],
    Action: ["intense"],
}

function detectMoodTags(query: string): string[] {
    const q = query.toLowerCase()
    const tags: string[] = []
    const pushTag = (tag: string) => { if (!tags.includes(tag)) tags.push(tag) }

    if (q.includes("feel good") || q.includes("feel-good")) pushTag("feel_good")
    if (q.includes("cozy") || q.includes("comfort") || q.includes("chill")) pushTag("cozy")
    if (q.includes("wholesome")) pushTag("wholesome")
    if (q.includes("gritty")) pushTag("gritty")
    if (q.includes("dark")) pushTag("dark")
    if (q.includes("intense")) pushTag("intense")
    if (q.includes("romantic") || q.includes("romance")) pushTag("romantic")
    if (q.includes("family") || q.includes("kids") || q.includes("children")) pushTag("family")
    if (q.includes("scary") || q.includes("horror")) pushTag("scary")
    if (q.includes("bittersweet")) pushTag("bittersweet")
    if (q.includes("slow burn") || q.includes("slow-burn")) pushTag("slow_burn")
    if (q.includes("mind bending") || q.includes("mind-bending")) pushTag("mind_bending")
    if (q.includes("uplifting") || q.includes("inspiring")) pushTag("uplifting")
    if (
        q.includes("sad") ||
        q.includes("emotional") ||
        q.includes("tearjerker") ||
        q.includes("tear jerker") ||
        q.includes("heartbreaking") ||
        q.includes("tragic") ||
        q.includes("melancholic") ||
        q.includes("melancholy") ||
        q.includes("somber") ||
        q.includes("weepy") ||
        q.includes("depressing")
    ) pushTag("sad")
    if (q.includes("nostalgic")) pushTag("nostalgic")
    if (q.includes("anxious") || q.includes("anxiety")) pushTag("anxious")
    if (q.includes("tense") || q.includes("tension")) pushTag("tense")
    if (q.includes("hopeful") || q.includes("optimistic")) pushTag("hopeful")
    if (q.includes("lonely") || q.includes("isolation") || q.includes("solitude")) pushTag("lonely")
    if (q.includes("healing")) pushTag("healing")
    if (q.includes("cathartic")) pushTag("cathartic")
    if (q.includes("angry") || q.includes("rage") || q.includes("fury")) pushTag("angry")
    if (q.includes("revenge") || q.includes("vengeful") || q.includes("vengeance")) pushTag("revenge")
    if (q.includes("mysterious") || q.includes("mystery")) pushTag("mysterious")
    if (q.includes("eerie") || q.includes("creepy") || q.includes("unsettling")) pushTag("eerie")
    if (q.includes("whimsical") || q.includes("quirky")) pushTag("whimsical")
    if (q.includes("absurd") || q.includes("surreal")) pushTag("absurd")
    if (q.includes("inspiring") || q.includes("motivational")) pushTag("inspiring")
    if (q.includes("heartwarming")) pushTag("heartwarming")
    if (q.includes("comforting") || q.includes("soothing")) pushTag("comforting")
    if (q.includes("dark comedy") || q.includes("black comedy")) pushTag("dark_comedy")
    if (q.includes("epic") || q.includes("grand") || q.includes("sweeping")) pushTag("epic")
    if (q.includes("suspenseful") || q.includes("edge of seat") || q.includes("edge-of-seat")) pushTag("suspenseful")
    if (q.includes("contemplative") || q.includes("thoughtful") || q.includes("reflective")) pushTag("contemplative")
    if (q.includes("tragic romance") || q.includes("star-crossed")) pushTag("romantic_tragic")

    // Expand composite moods
    for (const tag of [...tags]) {
        const expand = MOOD_EXPANSIONS[tag]
        if (expand) expand.forEach(pushTag)
    }

    return tags
}

function isMoodKeyword(value: string): boolean {
    const v = value.toLowerCase()
    if (MOOD_RULES[v]) return true
    return Array.from(SUBJECTIVE_KEYWORDS).some((kw) => v.includes(kw.replace(/\s+/g, " ")))
}

function parseYearRange(query: string): { year?: number; range?: YearRange } {
    const q = query.toLowerCase()
    const decadeWords: Record<string, number> = {
        "twenties": 2020,
        "thirties": 2030,
        "forties": 2040,
        "fifties": 2050,
        "sixties": 2060,
        "seventies": 2070,
        "eighties": 1980,
        "nineties": 1990,
    }
    for (const [word, start] of Object.entries(decadeWords)) {
        if (q.includes(word)) {
            return { range: { start, end: start + 9 } }
        }
    }
    const decadeTwoDigit = q.match(/\b(\d{2})s\b/)
    if (decadeTwoDigit) {
        const two = parseInt(decadeTwoDigit[1], 10)
        const start = two >= 0 && two <= 29 ? 2000 + two : 1900 + two
        return { range: { start, end: start + 9 } }
    }
    const explicitRange = q.match(/\b(19|20)\d{2}\s*-\s*(19|20)\d{2}\b/)
    if (explicitRange) {
        const start = parseInt(explicitRange[0].slice(0, 4))
        const end = parseInt(explicitRange[0].slice(-4))
        return { range: { start: Math.min(start, end), end: Math.max(start, end) } }
    }
    const decade = q.match(/\b(19|20)\d0s\b/)
    if (decade) {
        const start = parseInt(decade[0].slice(0, 4))
        return { range: { start, end: start + 9 } }
    }
    const yearMatch = q.match(/\b(19|20)\d{2}\b/)
    const year = yearMatch ? parseInt(yearMatch[0]) : undefined
    return { year }
}

function extractExcludedGenres(query: string): string[] {
    const q = query.toLowerCase()
    const out: string[] = []
    for (const [kw, name] of Object.entries(GENRE_KEYWORDS)) {
        const pattern = new RegExp(`\\b(?:not|no|without)\\s+${kw}\\b`, "i")
        if (pattern.test(q) && !out.includes(name)) out.push(name)
    }
    return out
}

/** Parse intent + signals into a structured object */
function parseQuery(query: string): ParsedQuery {
    const q = query.toLowerCase()

    const { year, range } = parseYearRange(q)
    const moodTags = detectMoodTags(q)

    let language: string | undefined
    for (const [kw, code] of Object.entries(LANGUAGE_KEYWORDS)) {
        if (q.includes(kw)) { language = code; break }
    }
    const region = language ? LANGUAGE_TO_REGION[language] : undefined

    const includeGenres: string[] = []
    for (const [kw, name] of Object.entries(GENRE_KEYWORDS)) {
        if (q.includes(kw) && !includeGenres.includes(name)) includeGenres.push(name)
    }

    const excludeGenres = extractExcludedGenres(q)

    const wantsTop = Array.from(INTENT_KEYWORDS).some((kw) => q.includes(kw))
    const wantsLatest = Array.from(LATEST_KEYWORDS).some((kw) => q.includes(kw))
    const wantsAward = Array.from(AWARD_KEYWORDS).some((kw) => q.includes(kw))
    const subjective = Array.from(SUBJECTIVE_KEYWORDS).some((kw) => q.includes(kw))

    const hasTitleHint = TITLE_HINTS.some((hint) => q.includes(hint))
    const quoted = q.match(/"([^"]+)"|'([^']+)'/)
    const quotedTitle = quoted ? (quoted[1] ?? quoted[2])?.trim() : undefined

    const tokens = q
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(Boolean)

    const cleanedTokens = tokens
        .filter((token) => !token.match(/^(19|20)\d{2}$/))
        .filter((token) => !GENERIC_WORDS.has(token))
        .filter((token) => !INTENT_KEYWORDS.has(token))
        .filter((token) => !LATEST_KEYWORDS.has(token))
        .filter((token) => !AWARD_KEYWORDS.has(token))
        .filter((token) => !Object.keys(LANGUAGE_KEYWORDS).includes(token))
        .filter((token) => !Object.keys(GENRE_KEYWORDS).includes(token))

    const tokenCount = cleanedTokens.length
    const joinedTokens = cleanedTokens.join(" ").trim()
    const allowSingleTokenSearch = tokenCount === 1 && cleanedTokens[0].length >= 4
    let titleCandidate = quotedTitle
        ?? (hasTitleHint ? query.trim() : undefined)
        ?? (((tokenCount >= 2 || allowSingleTokenSearch) && tokenCount <= 4) ? joinedTokens : undefined)

    if (titleCandidate && isMoodKeyword(titleCandidate)) {
        titleCandidate = undefined
    }

    const expandedMoodTags = [...moodTags]
    for (const g of includeGenres) {
        const mapped = GENRE_TO_MOODS[g]
        if (mapped) {
            for (const tag of mapped) {
                if (!expandedMoodTags.includes(tag)) expandedMoodTags.push(tag)
            }
        }
    }

    return {
        raw: query,
        tokens,
        year,
        yearRange: range,
        language,
        region,
        includeGenres: includeGenres.length ? includeGenres : undefined,
        excludeGenres: excludeGenres.length ? excludeGenres : undefined,
        moodTags: expandedMoodTags.length ? expandedMoodTags : undefined,
        intent: { top: wantsTop, latest: wantsLatest, award: wantsAward },
        titleCandidate,
        subjective,
    }
}

/** GPT is only called for pure vibe queries — no factual signals were found */
async function classifyVibe(query: string): Promise<Mood> {
    if (!process.env.OPENAI_API_KEY && !process.env.open_api_key) {
        return "imdb_top"
    }
    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0,
        max_tokens: 60,
        messages: [
            {
                role: "system",
                content: `Map this movie request to the closest mood. Return ONLY the mood key, nothing else.

Available moods:
- light_and_fun: feel-good, easy watches, cheerful, uplifting
- imdb_top: critically acclaimed, masterpieces, best ever made
- oscar: award-winning, prestige cinema
- srk: Shah Rukh Khan films
- latest: new releases, trending
- gritty_thrillers: dark, tense, edge-of-your-seat, slow burn, atmospheric
- quick_watches: short movies, under 90 minutes
- reality_and_drama: reality TV, bingeable drama
- whats_viral: what everyone is talking about`,
            },
            { role: "user", content: query },
        ],
    })

    const mood = (completion.choices[0].message.content ?? "").trim() as Mood
    const valid: Mood[] = ["light_and_fun", "imdb_top", "oscar", "srk", "latest", "gritty_thrillers", "quick_watches", "reality_and_drama", "whats_viral"]
    return valid.includes(mood) ? mood : "imdb_top"
}

function normalizeLanguage(value?: string | null): string | undefined {
    if (!value) return undefined
    const v = value.toLowerCase().trim()
    if (LANGUAGE_KEYWORDS[v]) return LANGUAGE_KEYWORDS[v]
    if (Object.values(LANGUAGE_KEYWORDS).includes(v)) return v
    return undefined
}

function inferRegion(language?: string): string | undefined {
    if (!language) return undefined
    return LANGUAGE_TO_REGION[language]
}

function normalizeGenres(input?: string[] | null): string[] | undefined {
    if (!input || input.length === 0) return undefined
    const out: string[] = []
    for (const g of input) {
        const name = Object.keys(GENRE_NAME_TO_ID).find((k) => k.toLowerCase() === g.toLowerCase())
        if (name && !out.includes(name)) out.push(name)
    }
    return out.length > 0 ? out : undefined
}

async function extractWithLLM(query: string): Promise<LlmExtract> {
    if (!process.env.OPENAI_API_KEY && !process.env.open_api_key) {
        throw new Error("OPENAI_API_KEY is missing in the server environment")
    }
    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0,
        max_tokens: 220,
        messages: [
            {
                role: "system",
                content: `Extract structured movie search intent as JSON. Return ONLY valid JSON.\n\nSchema:\n{\n  \"title\": string | null,\n  \"keywords\": string[],\n  \"year\": number | null,\n  \"yearRange\": {\"start\": number, \"end\": number} | null,\n  \"language\": string | null,      // ISO 639-1 if possible, else language name\n  \"region\": string | null,        // ISO 3166-1 if possible\n  \"includeGenres\": string[],      // genre names like Comedy, Thriller\n  \"excludeGenres\": string[],\n  \"moodTags\": string[],           // mood/emotion tags like sad, dark, intense, feel_good, uplifting\n  \"intent\": {\"top\": boolean, \"latest\": boolean, \"award\": boolean}\n}\n\nRules:\n- If decade is mentioned (e.g., 90s), set yearRange.\n- If exact year, set year.\n- If title is explicit, set title.\n- Populate keywords with remaining meaningful tokens.\n- Map emotional adjectives to moodTags when possible.\n- Use empty arrays when none.\n- Do not include extra fields.`,
            },
            { role: "user", content: query },
        ],
    })
    const raw = (completion.choices[0].message.content ?? "").trim()
    try {
        return JSON.parse(raw) as LlmExtract
    } catch {
        throw new Error(`LLM returned invalid JSON: ${raw}`)
    }
}

function normalizeMoodTags(input?: string[] | null): string[] | undefined {
    if (!input || input.length === 0) return undefined
    const tags: string[] = []
    const pushTag = (tag: string) => { if (!tags.includes(tag)) tags.push(tag) }
    for (const raw of input) {
        const v = raw.toLowerCase().trim()
        if (v.includes("feel")) pushTag("feel_good")
        else if (v.includes("dark")) pushTag("dark")
        else if (v.includes("gritty")) pushTag("gritty")
        else if (v.includes("intense") || v.includes("tense") || v.includes("suspense")) pushTag("intense")
        else if (v.includes("anxious") || v.includes("anxiety")) pushTag("anxious")
        else if (v.includes("scary") || v.includes("horror")) pushTag("scary")
        else if (v.includes("romantic") || v.includes("romance")) pushTag("romantic")
        else if (v.includes("family") || v.includes("kids")) pushTag("family")
        else if (v.includes("bittersweet") || v.includes("melancholy") || v.includes("melancholic")) pushTag("bittersweet")
        else if (v.includes("slow")) pushTag("slow_burn")
        else if (v.includes("mind")) pushTag("mind_bending")
        else if (v.includes("uplifting") || v.includes("inspiring") || v.includes("hopeful") || v.includes("optimistic")) pushTag("uplifting")
        else if (v.includes("sad") || v.includes("tear") || v.includes("heartbreak") || v.includes("tragic") || v.includes("somber") || v.includes("weep")) pushTag("sad")
        else if (v.includes("nostalgic")) pushTag("nostalgic")
        else if (v.includes("lonely") || v.includes("isolation")) pushTag("lonely")
        else if (v.includes("healing") || v.includes("cathartic")) pushTag("healing")
        else if (v.includes("angry") || v.includes("rage") || v.includes("revenge") || v.includes("vengeful")) pushTag("angry")
        else if (v.includes("mysterious") || v.includes("eerie")) pushTag("mysterious")
        else if (v.includes("whimsical") || v.includes("quirky")) pushTag("whimsical")
        else if (v.includes("absurd") || v.includes("surreal")) pushTag("absurd")
        else if (v.includes("heartwarming")) pushTag("heartwarming")
        else if (v.includes("comforting") || v.includes("soothing")) pushTag("comforting")
        else if (v.includes("dark comedy") || v.includes("black comedy")) pushTag("dark_comedy")
        else if (v.includes("epic") || v.includes("grand") || v.includes("sweeping")) pushTag("epic")
        else if (v.includes("contemplative") || v.includes("thoughtful") || v.includes("reflective")) pushTag("contemplative")
        else if (v.includes("tragic romance") || v.includes("star-crossed")) pushTag("romantic_tragic")
        else if (MOOD_RULES[v]) pushTag(v)
    }
    for (const tag of [...tags]) {
        const expand = MOOD_EXPANSIONS[tag]
        if (expand) expand.forEach(pushTag)
    }
    return tags.length > 0 ? tags : undefined
}

async function fetchTmdbPage(params: URLSearchParams, page: number): Promise<TmdbMovie[]> {
    const p = new URLSearchParams(params)
    p.set("page", String(page))
    const apiKey = process.env.TMDB_API_KEY
    if (!apiKey) {
        throw new Error("TMDB_API_KEY is missing in the server environment")
    }
    p.set("api_key", apiKey)
    console.log("[ai-search] TMDB discover params:", p.toString())
    const res = await fetchWithRetry(`${TMDB_BASE}/discover/movie?${p.toString()}`)
    if (!res.ok) {
        console.error(`[ai-search] TMDB error ${res.status}: ${await res.text()}`)
        return []
    }
    const data = (await res.json()) as { results: TmdbMovie[] }
    return data.results ?? []
}

async function fetchDiscoverMovies(params: URLSearchParams, pages: number): Promise<TmdbMovie[]> {
    const tasks: Promise<TmdbMovie[]>[] = []
    for (let page = 1; page <= pages; page++) {
        tasks.push(fetchTmdbPage(params, page))
    }
    const results = await Promise.allSettled(tasks)
    const fulfilled = results
        .filter((r): r is PromiseFulfilledResult<TmdbMovie[]> => r.status === "fulfilled")
        .map((r) => r.value)
    const rejected = results.filter((r) => r.status === "rejected")
    if (rejected.length > 0) {
        console.warn(`[ai-search] discover pages failed: ${rejected.length}/${pages}`)
    }
    return fulfilled.flat()
}

async function fetchTmdbSearchPage(params: URLSearchParams, page: number): Promise<TmdbMovie[]> {
    const p = new URLSearchParams(params)
    p.set("page", String(page))
    const apiKey = process.env.TMDB_API_KEY
    if (!apiKey) {
        throw new Error("TMDB_API_KEY is missing in the server environment")
    }
    p.set("api_key", apiKey)
    console.log("[ai-search] TMDB search params:", p.toString())
    const res = await fetchWithRetry(`${TMDB_BASE}/search/movie?${p.toString()}`)
    if (!res.ok) {
        console.error(`[ai-search] TMDB search error ${res.status}: ${await res.text()}`)
        return []
    }
    const data = (await res.json()) as { results: TmdbMovie[] }
    return data.results ?? []
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithRetry(url: string, attempts = 2, baseDelayMs = 200, timeoutMs = 3500): Promise<Response> {
    let lastError: unknown
    for (let i = 0; i < attempts; i++) {
        try {
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), timeoutMs)
            const res = await fetch(url, { signal: controller.signal })
            clearTimeout(timeout)
            return res
        } catch (err) {
            lastError = err
            const delay = baseDelayMs * Math.pow(2, i)
            console.warn(`[ai-search] fetch failed (attempt ${i + 1}/${attempts}), retrying in ${delay}ms`)
            await sleep(delay)
        }
    }
    throw lastError instanceof Error ? lastError : new Error("fetch failed")
}

async function streamBatches(controller: ReadableStreamDefaultController, encoder: TextEncoder, payload: unknown) {
    controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`))
}

async function streamDiscoverPagesIncremental(
    params: URLSearchParams,
    parsed: ParsedQuery,
    maxPages: number,
    maxResults: number,
    controller: ReadableStreamDefaultController,
    encoder: TextEncoder
): Promise<number> {
    let total = 0
    for (let page = 1; page <= maxPages; page++) {
        const pageResults = await fetchTmdbPage(params, page)
        if (pageResults.length === 0) break
        let mapped = pageResults
            .filter((t) => t.poster_path)
            .map(tmdbToMovie)
        const moodApplied = applyMoodToolset(parsed, mapped)
        mapped = moodApplied.movies
        if (total + mapped.length > maxResults) {
            mapped = mapped.slice(0, maxResults - total)
        }
        total += mapped.length
        if (mapped.length > 0) {
            await streamBatches(controller, encoder, { type: "batch", movies: mapped })
        }
        if (total >= maxResults) break
    }
    return total
}

async function streamSearchPagesIncremental(
    params: URLSearchParams,
    parsed: ParsedQuery,
    maxPages: number,
    maxResults: number,
    controller: ReadableStreamDefaultController,
    encoder: TextEncoder
): Promise<number> {
    let total = 0
    for (let page = 1; page <= maxPages; page++) {
        const pageResults = await fetchTmdbSearchPage(params, page)
        if (pageResults.length === 0) break
        let mapped = pageResults
            .filter((t) => t.poster_path)
            .map(tmdbToMovie)
        const moodApplied = applyMoodToolset(parsed, mapped)
        mapped = moodApplied.movies
        if (total + mapped.length > maxResults) {
            mapped = mapped.slice(0, maxResults - total)
        }
        total += mapped.length
        if (mapped.length > 0) {
            await streamBatches(controller, encoder, { type: "batch", movies: mapped })
        }
        if (total >= maxResults) break
    }
    return total
}

async function collectDiscoverPages(params: URLSearchParams, parsed: ParsedQuery, maxPages: number, maxResults: number): Promise<Movie[]> {
    const movies: Movie[] = []
    for (let page = 1; page <= maxPages; page++) {
        const pageResults = await fetchTmdbPage(params, page)
        if (pageResults.length === 0) break
        const mapped = pageResults
            .filter((t) => t.poster_path)
            .map(tmdbToMovie)
        movies.push(...mapped)
        if (movies.length >= maxResults) break
    }
    const moodApplied = applyMoodToolset(parsed, movies)
    return moodApplied.movies
}

function tmdbToMovie(t: TmdbMovie): Movie {
    return {
        id: `tmdb_${t.id}`,
        title: t.title,
        poster_url: t.poster_path ? `${TMDB_IMAGE_BASE}${t.poster_path}` : "",
        genre: t.genre_ids.map((id) => GENRE_ID_TO_NAME[id]).filter(Boolean),
        year: parseInt(t.release_date?.split("-")[0] ?? "0"),
        overview: t.overview,
        imdb_rating: Math.round(t.vote_average * 10) / 10,
        mood: "latest" as Mood,
        ott_providers: [],
    }
}

function filterByYear(movies: Movie[], year?: number): Movie[] {
    if (!year) return movies
    return movies.filter((m) => m.year === year)
}

function scorePaths(parsed: ParsedQuery): { search: number; discover: number; mood: number } {
    let search = 0
    let discover = 0
    let mood = 0

    if (parsed.titleCandidate) search += 2
    if (parsed.tokens.length <= 3 && !parsed.language && !parsed.includeGenres && !parsed.year && !parsed.yearRange && !parsed.moodTags) search += 1
    if (parsed.intent.top || parsed.intent.latest || parsed.intent.award) discover += 1
    if (parsed.year || parsed.yearRange) discover += 2
    if (parsed.language) discover += 1
    if (parsed.includeGenres && parsed.includeGenres.length > 0) discover += 2
    if (parsed.excludeGenres && parsed.excludeGenres.length > 0) discover += 1

    if (parsed.subjective || (parsed.moodTags && parsed.moodTags.length > 0)) mood += 2
    if (!parsed.year && !parsed.yearRange && !parsed.language && !parsed.includeGenres) mood += 1

    return { search, discover, mood }
}

function applyMoodToolset(parsed: ParsedQuery, movies: Movie[]): { movies: Movie[]; applied: { include: string[]; exclude: string[] } } {
    const tags = parsed.moodTags ?? []
    if (tags.length === 0) return { movies, applied: { include: [], exclude: [] } }

    const includeSet = new Set<string>()
    const excludeSet = new Set<string>()
    const keywordSet = new Set<string>()

    for (const tag of tags) {
        const rule = MOOD_RULES[tag]
        if (!rule) continue
        rule.include.forEach((g) => includeSet.add(g))
        rule.exclude.forEach((g) => excludeSet.add(g))
        rule.keywords.forEach((k) => keywordSet.add(k))
    }

    const exclude = Array.from(excludeSet)
    const include = Array.from(includeSet)
    const keywords = Array.from(keywordSet)

    const filtered = exclude.length > 0
        ? movies.filter((m) => !m.genre?.some((g) => exclude.includes(g)))
        : movies

    const scored = filtered.map((m) => {
        let score = 0
        if (include.length > 0 && m.genre) {
            for (const g of m.genre) {
                if (include.includes(g)) score += 3
            }
        }
        if (keywords.length > 0) {
            const hay = `${m.title} ${m.overview}`.toLowerCase()
            for (const kw of keywords) {
                if (hay.includes(kw)) score += 2
            }
        }
        return { m, score }
    })

    scored.sort((a, b) => b.score - a.score)
    return { movies: scored.map((s) => s.m), applied: { include, exclude } }
}

function sortByClosestYear(movies: Movie[], targetYear: number): Movie[] {
    return [...movies].sort((a, b) => {
        const da = Math.abs(a.year - targetYear)
        const db = Math.abs(b.year - targetYear)
        if (da !== db) return da - db
        if (a.year !== b.year) return b.year - a.year
        return b.imdb_rating - a.imdb_rating
    })
}

function formatDate(date: Date): string {
    const y = date.getUTCFullYear()
    const m = `${date.getUTCMonth() + 1}`.padStart(2, "0")
    const d = `${date.getUTCDate()}`.padStart(2, "0")
    return `${y}-${m}-${d}`
}

function buildDiscoverParams(parsed: ParsedQuery, options: { relaxVoteCount?: boolean; widenYear?: boolean; ignoreYear?: boolean; ignoreLatestWindow?: boolean } = {}): URLSearchParams {
    const wantsTop = parsed.intent.top
    const wantsLatest = parsed.intent.latest
    const params = new URLSearchParams({
        sort_by: wantsTop ? "vote_average.desc" : wantsLatest ? "primary_release_date.desc" : "popularity.desc",
        "vote_count.gte": wantsTop ? (options.relaxVoteCount ? "10" : "100") : "10",
    })

    if (parsed.language) params.set("with_original_language", parsed.language)
    if (parsed.region) params.set("region", parsed.region)

    const includeIds = (parsed.includeGenres ?? []).map((g) => GENRE_NAME_TO_ID[g]).filter(Boolean)
    if (includeIds.length > 0) params.set("with_genres", includeIds.join(","))
    const excludeIds = (parsed.excludeGenres ?? []).map((g) => GENRE_NAME_TO_ID[g]).filter(Boolean)
    if (excludeIds.length > 0) params.set("without_genres", excludeIds.join(","))

    const today = new Date()
    if (parsed.intent.latest && !options.ignoreLatestWindow) {
        const past = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 18, today.getUTCDate()))
        params.set("primary_release_date.gte", formatDate(past))
        params.set("primary_release_date.lte", formatDate(today))
    }

    if (!options.ignoreYear && parsed.yearRange) {
        const start = parsed.yearRange.start
        const end = parsed.yearRange.end
        params.set("primary_release_date.gte", `${start}-01-01`)
        params.set("primary_release_date.lte", `${end}-12-31`)
    } else if (!options.ignoreYear && parsed.year) {
        const start = options.widenYear ? parsed.year - 1 : parsed.year
        const end = parsed.year
        params.set("primary_release_date.gte", `${start}-01-01`)
        params.set("primary_release_date.lte", `${end}-12-31`)
    }

    return params
}

function discoverPageCount(parsed: ParsedQuery): number {
    // Tight filters (year/language/region) usually return fewer results; avoid fetching 5 pages.
    if (parsed.year || parsed.yearRange || parsed.language || parsed.region) return 2
    return 5
}

async function runDiscover(parsed: ParsedQuery, options: { relaxVoteCount?: boolean; widenYear?: boolean; ignoreYear?: boolean; ignoreLatestWindow?: boolean } = {}): Promise<{ movies: Movie[]; params: string }> {
    const params = buildDiscoverParams(parsed, options)
    console.log(`[ai-search] → discover TMDB params: ${params.toString()}`)
    const discoverRaw = await fetchDiscoverMovies(params, discoverPageCount(parsed))
    const movies: Movie[] = discoverRaw
        .filter((t) => t.poster_path)
        .map(tmdbToMovie)
    return { movies, params: params.toString() }
}

async function runSearch(parsed: ParsedQuery): Promise<{ movies: Movie[]; params: string }> {
    if (!parsed.titleCandidate) return { movies: [], params: "" }
    const params = new URLSearchParams({ query: parsed.titleCandidate })
    if (parsed.year) params.set("year", String(parsed.year))
    const results = await Promise.allSettled([
        fetchTmdbSearchPage(params, 1),
        fetchTmdbSearchPage(params, 2),
    ])
    const pages = results
        .filter((r): r is PromiseFulfilledResult<TmdbMovie[]> => r.status === "fulfilled")
        .map((r) => r.value)
    const rejected = results.filter((r) => r.status === "rejected")
    if (rejected.length > 0) {
        console.warn(`[ai-search] search pages failed: ${rejected.length}/2`)
    }
    const movies: Movie[] = pages.flat()
        .filter((t) => t.poster_path)
        .map(tmdbToMovie)
    return { movies, params: params.toString() }
}

export async function POST(req: NextRequest) {
    try {
        const { query } = (await req.json()) as { query: string }
        const debug: Record<string, unknown> = { query }

        if (!query?.trim()) {
            debug.error = "missing_query"
            return NextResponse.json({ type: "vibe", mood: "imdb_top", debug }, { status: 400 })
        }

        const wantsStream = req.nextUrl.searchParams.get("stream") === "1"

        const heuristic = parseQuery(query)
        const llm = await extractWithLLM(query)
        debug.llm = llm

        const merged: ParsedQuery = {
            ...heuristic,
            year: llm.year ?? heuristic.year,
            yearRange: llm.yearRange ?? heuristic.yearRange,
            language: normalizeLanguage(llm.language ?? heuristic.language),
            region: llm.region ?? inferRegion(normalizeLanguage(llm.language ?? heuristic.language)),
            includeGenres: normalizeGenres(llm.includeGenres) ?? heuristic.includeGenres,
            excludeGenres: normalizeGenres(llm.excludeGenres) ?? heuristic.excludeGenres,
            moodTags: normalizeMoodTags(llm.moodTags) ?? heuristic.moodTags,
            intent: {
                top: llm.intent?.top ?? heuristic.intent.top,
                latest: llm.intent?.latest ?? heuristic.intent.latest,
                award: llm.intent?.award ?? heuristic.intent.award,
            },
            titleCandidate: llm.title ?? (llm.keywords && llm.keywords.length > 0 ? llm.keywords.join(" ") : heuristic.titleCandidate),
        }

        debug.parsed = merged
        console.log(`[ai-search] query="${query}" | parsed:`, merged)

        let path: "search" | "discover" = "discover"
        const hasFilters = Boolean(
            merged.year || merged.yearRange || merged.language || (merged.includeGenres && merged.includeGenres.length > 0)
        )
        if (!hasFilters && merged.titleCandidate) {
            path = "search"
        }

        if (wantsStream) {
            const encoder = new TextEncoder()
            const stream = new ReadableStream({
                async start(controller) {
                    try {
                        const moodMeta = applyMoodToolset(merged, [])
                        const maxResults = 100
                        const maxPages = 5
                        let params = ""

                        if (path === "search" && merged.titleCandidate) {
                            const searchParams = new URLSearchParams({ query: merged.titleCandidate })
                            if (merged.year) searchParams.set("year", String(merged.year))
                            params = searchParams.toString()
                            await streamBatches(controller, encoder, {
                                type: "meta",
                                debug: { ...debug, path, params, mood_filters: moodMeta.applied },
                            })
                            const total = await streamSearchPagesIncremental(
                                searchParams,
                                merged,
                                2,
                                maxResults,
                                controller,
                                encoder
                            )
                            await streamBatches(controller, encoder, { type: "done", count: total })
                            controller.close()
                            return
                        }

                        const discoverParams = buildDiscoverParams(merged)
                        const page1 = await fetchTmdbPage(discoverParams, 1)
                        if (page1.length === 0 && merged.year) {
                            const dropped = buildDiscoverParams(merged, { ignoreYear: true, ignoreLatestWindow: true })
                            params = dropped.toString()
                            debug.fallback = "drop_year_keep_language"
                            await streamBatches(controller, encoder, {
                                type: "meta",
                                debug: { ...debug, path, params, mood_filters: moodMeta.applied },
                            })
                            const collected = await collectDiscoverPages(dropped, merged, maxPages, maxResults)
                            const sorted = sortByClosestYear(collected, merged.year)
                            let total = 0
                            for (let i = 0; i < sorted.length; i += 20) {
                                const batch = sorted.slice(i, i + 20)
                                total += batch.length
                                await streamBatches(controller, encoder, { type: "batch", movies: batch })
                            }
                            await streamBatches(controller, encoder, { type: "done", count: total })
                            controller.close()
                            return
                        }

                        params = discoverParams.toString()
                        await streamBatches(controller, encoder, {
                            type: "meta",
                            debug: { ...debug, path, params, mood_filters: moodMeta.applied },
                        })
                        const total = await streamDiscoverPagesIncremental(
                            discoverParams,
                            merged,
                            maxPages,
                            maxResults,
                            controller,
                            encoder
                        )
                        await streamBatches(controller, encoder, { type: "done", count: total })
                        controller.close()
                    } catch (err) {
                        console.error("[ai-search] stream error:", err)
                        await streamBatches(controller, encoder, { type: "done", count: 0 })
                        controller.close()
                    }
                },
            })

            return new NextResponse(stream, {
                headers: {
                    "Content-Type": "application/x-ndjson",
                    "Cache-Control": "no-cache, no-transform",
                    "Connection": "keep-alive",
                },
            })
        }

        const MIN_RESULTS = 10
        let movies: Movie[] = []
        let lastParams = ""
        let fallbackUsed: string | null = null

        if (path === "search") {
            const searched = await runSearch(merged)
            lastParams = searched.params
            movies = searched.movies
            if (merged.year) movies = filterByYear(movies, merged.year)
            if (movies.length < MIN_RESULTS) {
                fallbackUsed = "search_to_discover"
                const discovered = await runDiscover(merged)
                lastParams = discovered.params
                movies = discovered.movies
            }
        } else if (path === "discover") {
            const discovered = await runDiscover(merged)
            lastParams = discovered.params
            movies = discovered.movies
        }

        if (path === "discover" || fallbackUsed === "search_to_discover") {
            if (merged.year) movies = filterByYear(movies, merged.year)
            if (movies.length < MIN_RESULTS) {
                const relaxed = await runDiscover(merged, { relaxVoteCount: true })
                lastParams = relaxed.params
                movies = merged.year ? filterByYear(relaxed.movies, merged.year) : relaxed.movies
                if (movies.length < MIN_RESULTS && merged.year) {
                    if (movies.length === 0) {
                        const dropped = await runDiscover(merged, { relaxVoteCount: true, ignoreYear: true, ignoreLatestWindow: true })
                        lastParams = dropped.params
                        movies = sortByClosestYear(dropped.movies, merged.year)
                        fallbackUsed = "drop_year_keep_language"
                    } else {
                        const widened = await runDiscover(merged, { relaxVoteCount: true, widenYear: true })
                        lastParams = widened.params
                        movies = filterByYear(widened.movies, merged.year)
                        if (movies.length < MIN_RESULTS && merged.titleCandidate) {
                            fallbackUsed = "discover_to_search"
                            const searched = await runSearch(merged)
                            lastParams = searched.params
                            movies = merged.year ? filterByYear(searched.movies, merged.year) : searched.movies
                        }
                    }
                }
            }
        }

        const moodApplied = applyMoodToolset(merged, movies)
        movies = moodApplied.movies

        debug.path = path
        debug.params = lastParams
        debug.fallback = fallbackUsed
        debug.mood_filters = moodApplied.applied
        debug.counts = { filtered: movies.length }
        return NextResponse.json({ type: "factual", movies, debug })
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error("[ai-search] error:", err)
        return NextResponse.json(
            { type: "error", error: "ai_search_failed", message },
            { status: 500 }
        )
    }
}
