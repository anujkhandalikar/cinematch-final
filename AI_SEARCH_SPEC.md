# AI Search Classification Spec (One Page)

## Purpose
Provide a predictable, explainable pipeline for user movie queries that blends intent parsing, endpoint selection, and deterministic fallbacks. Avoid brittle “vibe vs factual” branching.

## Inputs
A free‑form query string from the user.

## Outputs
- `type: factual` with TMDB results, or
- `type: vibe` with a mood key (when only subjective intent is present)

## Parsing (Always On)
Parse the query into a structured object:
- `year` or `yearRange` (e.g., 2025, 2020–2025, 2020s)
- `language` and inferred `region`
- `includeGenres` and `excludeGenres` (e.g., “not horror”)
- `intent`: `top`, `latest`, `award`
- `titleCandidate` (quoted text, title hints, short token sequences)
- `subjective` (e.g., “feel‑good,” “cozy,” “vibes”)

## Path Scoring
Compute scores for three paths:
- **Search**: title‑like signals
- **Discover**: filters + intent
- **Vibe**: purely subjective

Pick the highest score; default to **Discover** if scores are low or ambiguous.

## Path Selection Rules (Summary)
- **Search path** if title signals dominate and search score >= 2.
- **Discover path** if any structured filters exist (year, language, genre, top/latest).
- **Vibe path** only when subjective intent dominates and no structured filters exist.

## Discover Query Construction
- Base sort: `top → vote_average.desc`, `latest → primary_release_date.desc`, else `popularity.desc`.
- `vote_count.gte`: 100 for top (relaxable), 10 otherwise.
- `primary_release_date` range for year/yearRange/latest (not only `primary_release_year`).
- `with_original_language` and `region` when language implies region.
- `with_genres` / `without_genres` for include/exclude genres.

## Fallback Ladder (Deterministic)
1. **Search** (title) → if too few results, fallback to Discover.
2. **Discover** (strict) → if too few results, relax `vote_count`.
3. **Discover** (relaxed) → if still sparse and year specified, widen year window.
4. If still sparse and subjective intent exists → fallback to **Vibe**.

## Thresholds
- `MIN_RESULTS`: 10 (used to decide fallback).

## Debug Metadata (Always Returned in Dev)
Include:
- `parsed` (structured query)
- `scores`
- `path` (chosen)
- `params` (TMDB query string)
- `counts` (result size)
- `fallback` (if used)

