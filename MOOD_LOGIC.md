# Mood Card Population Logic

This document explains the technical logic used to categorize and populate movie cards based on user-selected "Moods" in CineMatch.

## Overview

The mood-based movie selection flow operates in three layers:
1.  **Seeding Layer**: Movies are fetched from the TMDB API and categorized into moods.
2.  **Storage Layer**: Categorized movies are stored in the Supabase `movies` table with a `mood` identifier.
3.  **Client Layer**: The application queries the database for movies matching the selected mood.

## Mood Logic Table

The following table describes the specific criteria used to define each mood during the seeding process:

| Mood | Label | TMDB Fetch Logic / Criteria | Description |
| :--- | :--- | :--- | :--- |
| `imdb_top` | IMDb Rated Top | Fetched from `/movie/top_rated` | The highest-rated films based on global TMDB/IMDb community votes. |
| `light_and_fun` | Something Light & Fun | Fetched from `/discover/movie` with **Genres: 35 (Comedy), 10751 (Family)** | Filtered for feel-good content, sorted by popularity. |
| `bollywood` | Bollywood | Fetched from `/discover/movie` with **Region: IN, Language: hi (Hindi)** | Specifically targets Indian cinema in the Hindi language. |
| `oscar` | Oscar Winners | Fetched from **TMDB List ID 5097** | A curated collection of Academy Award Best Picture winners. |
| `srk` | Shah Rukh Khan | Fetched from **Person ID 1100** | All movie credits where Shah Rukh Khan is part of the cast. |

## Technical Implementation Details

### 1. Data Categorization (Seeding)
The script `scripts/seed-movies-from-tmdb.ts` is responsible for populating the database. It maps specific TMDB endpoints to the application's mood types:

```typescript
// Example from seed-movies-from-tmdb.ts
async function fetchLightAndFun(genreMap: Map<number, string>): Promise<SupabaseMovieRow[]> {
  return await tmdbGet("/discover/movie", {
    with_genres: "35,10751", // Comedy & Family
    sort_by: "vote_count.desc",
  });
}
```

### 2. OTT Provider Enrichment
During seeding, each movie is checked for streaming availability in India (`WATCH_REGION = "IN"`). 
- Providers are normalized (e.g., "Disney Plus" becomes "Disney+ Hotstar").
- Only whitelisted providers (Netflix, Prime, Zee5, etc.) are stored.

### 3. Data Retrieval
When a user selects a mood, the application calls `getMoviesByMood(mood)` from `src/lib/movies.ts`. This performs a direct filter on the `mood` column in Supabase:

```typescript
// Example from src/lib/movies.ts
export async function getMoviesByMood(mood: Mood): Promise<Movie[]> {
    const { data } = await supabase
        .from("movies")
        .select("*")
        .eq("mood", mood); // Filters by the stored mood tag
    return data;
}
```

### 4. Card Presentation
The movie cards are displayed in the `SwipeDeck` component. The order is randomized on the client side using a deterministic seed (`shuffleWithSeed`) to ensure all participants in a Dual Session see the same movies in the same order.
