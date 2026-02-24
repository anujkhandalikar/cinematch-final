# Mood Card Population Logic

This document explains how movies (and TV shows) are categorized, seeded, and served for each mood in CineMatch.

## Overview

The mood-based movie selection flow operates in three layers:
1. **Seeding Layer**: Content is fetched from the TMDB API (or manually hardcoded) and inserted into Supabase with a `mood` tag.
2. **Storage Layer**: All content lives in the Supabase `movies` table with a `mood` column as the primary filter.
3. **Client Layer**: The app queries Supabase by `mood` and shuffles results deterministically so both users in a Dual Session see the same order.

---

## Mood Catalogue

There are **11 moods** in three groups.

### Group 1 — Core Moods (TMDB API seeded)

Seeded via `scripts/seed-movies-from-tmdb.ts`. Each fetch pulls 5 pages (~100 results) and is enriched with Indian OTT availability.

| Mood | Label | TMDB Endpoint / Source | Key Params |
| :--- | :--- | :--- | :--- |
| `imdb_top` | IMDb Top Rated | `/movie/top_rated` | 5 pages |
| `light_and_fun` | Light & Fun | `/discover/movie` | `with_genres: "35,10751"` (Comedy + Family), `sort_by: vote_count.desc` |
| `bollywood` | Bollywood | `/discover/movie` | `region: IN`, `with_original_language: hi`, `sort_by: vote_count.desc` |
| `oscar` | Oscar Winners | `/list/28` | TMDB curated list — all Academy Award Best Picture winners, paginated |
| `srk` | Shah Rukh Khan | `/person/35742/movie_credits` | All movies where SRK appears in the cast |

### Group 2 — New Moods (initially hardcoded, topped up via TMDB)

Initially seeded via `scripts/seed-new-moods.ts` as a small set of manually hardcoded rows. Gaps are filled by `scripts/topup-movies.ts`, which targets **≥ 20 movies per OTT provider** per mood and a **total of ≥ 100** entries.

| Mood | Label | Top-Up TMDB Logic | Notes |
| :--- | :--- | :--- | :--- |
| `latest` | Latest | `/discover/movie` | `primary_release_date.gte: 2024-01-01`, sorted by vote avg |
| `gritty_thrillers` | Gritty Thrillers | `/discover/movie` | `with_genres: "80,53"` (Crime + Thriller) |
| `quick_watches` | Quick Watches | `/discover/movie` | `with_runtime.lte: 100` (≤ 100 mins) |
| `reality_and_drama` | Reality & Drama | `/discover/tv` | `with_genres: 10764` (Reality TV), `sort_by: popularity.desc` |
| `whats_viral` | What's Viral | `/trending/all/week` | Weekly trending across all media types |

### Group 3 — Curated

Seeded via `scripts/seed-anuj-picks.ts`. This mood is different from all others.

| Mood | Label | Source | Notes |
| :--- | :--- | :--- | :--- |
| `anuj_picks` | Anuj's Picks | Manually curated list (~37 titles) | **Includes both movies and TV shows.** Each entry is searched on TMDB by title + year. OTT providers are fetched live for each result. |

---

## ID Naming Conventions

Row IDs in Supabase are constructed differently depending on how the entry was seeded:

| Source | ID Format | Example |
| :--- | :--- | :--- |
| Core moods (seed-movies-from-tmdb) | `{mood}_{tmdb_id}` | `imdb_top_550` |
| New moods (seed-new-moods / topup) | `{mood}_{tmdb_id}` | `gritty_thrillers_27205` |
| Anuj picks — movies | `anuj_picks_m_{tmdb_id}` | `anuj_picks_m_550` |
| Anuj picks — TV shows | `anuj_picks_tv_{tmdb_id}` | `anuj_picks_tv_1396` |
| Legacy light_and_fun entries | `fun_1` … `fun_9` | `fun_3` |

---

## OTT Provider Enrichment

During seeding, each movie is checked for Indian streaming availability (`WATCH_REGION = "IN"`) via `/movie/{id}/watch/providers` (or `/tv/{id}/watch/providers` for TV).

**Whitelist** (only these providers are stored):

| Provider | Notes |
| :--- | :--- |
| Netflix | — |
| Amazon Prime Video | — |
| Zee5 | `ZEE5` is normalized to `Zee5` |
| MUBI | — |
| Lionsgate Play | — |
| Jio Hotstar | TMDB provider ID **2336** (`"JioHotstar"`) — the unified post-merger platform available in India. All legacy variant names (`JioCinema`, `Jio Cinema`, `Disney+ Hotstar`, `Disney Plus`, `Hotstar`) are normalized to `"Jio Hotstar"` in the DB. |

> The `topup-movies.ts` script also recognises **SonyLIV** when filling gaps, so it may appear on entries seeded through that route.

Only **flatrate** (subscription) providers are stored — rental/purchase entries are ignored.

### Jio Hotstar Enrichment Scripts

Two scripts handle Jio Hotstar specifically:

| Script | Purpose |
| :--- | :--- |
| `scripts/enrich-jio-hotstar.ts` | **Run first.** Scans all ~1000 existing DB movies and additively merges `"Jio Hotstar"` into `ott_providers` for any title confirmed on JioCinema or Disney+ Hotstar (flatrate, India) — without touching other provider data. |
| `scripts/topup-movies.ts` | **Run after enrich.** Now targets `"Jio Hotstar"` (queries both TMDB IDs 220 and 122) and fills gaps to ≥ 20 Jio Hotstar movies per mood. New candidates are **strictly verified** individually via `/watch/providers` before being inserted. |

---

## Seeding Scripts Summary

| Script | Purpose |
| :--- | :--- |
| `scripts/seed-movies-from-tmdb.ts` | Initial seed for the 5 core moods. Supports `--mood <name>` and `--clean` flags. |
| `scripts/seed-new-moods.ts` | Inserts stub rows for the 5 new moods (hardcoded data). Run once. |
| `scripts/topup-movies.ts` | Audit + fill script. Ensures ≥ 20 movies per OTT provider and ≥ 100 total per mood across the 10 non-curated moods. |
| `scripts/seed-anuj-picks.ts` | Seeds the `anuj_picks` mood from the curated title list. Safe to re-run (uses upsert). |
| `scripts/backfill-ott-providers.ts` | Backfills OTT data for existing rows that have empty `ott_providers`. |

---

## Data Retrieval (Client)

`src/lib/movies.ts` exposes the following functions:

- **`getMoviesByMood(mood)`** — Fetches up to 100 movies for a single mood via `supabase.from("movies").select(...).eq("mood", mood).limit(100)`.
- **`getMoviesByMoods(moods[])`** — OR-query across multiple moods (`.in("mood", moods)`), deduplicated by ID, ordered by `id` for a stable base order.
- **`getMoviesByIds(ids[])`** — Fetch specific entries by their Supabase row IDs.
- **`getAvailableProviders(mood?)`** — Returns the distinct OTT providers for a mood (used for filter UI).

---

## Deterministic Shuffle (Dual Sessions)

After fetching, the card deck is shuffled on the client using `shuffleWithSeed(array, seed)`:

- Algorithm: **Fisher-Yates** with a **Mulberry32** seeded PRNG.
- Seed: derived from the session ID (string → 32-bit integer via a simple polynomial hash).
- Result: both participants in a Dual Session receive the same movies in the same order, regardless of device or fetch timing.
