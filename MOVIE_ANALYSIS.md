# CineMatch Movie Database Analysis

> Last updated: 2026-02-20  
> Source: Supabase `movies` table (live query)

---

## Summary

| Mood | Label | Total | Target (100) | Status | OTT Coverage |
|------|-------|------:|:------------:|--------|:------------:|
| `imdb_top` | IMDb Top Rated | 100 | 100 | OK | 34% (34/100) |
| `light_and_fun` | Light & Fun | 109 | 100 | OK | 27% (29/109) |
| `bollywood` | Bollywood | 100 | 100 | OK | 69% (69/100) |
| `oscar` | Oscar Winners | 98 | 100 | OK (98 Best Picture winners exist) | 12% (12/98) |
| `srk` | Shah Rukh Khan | 109 | 100 | OK | 74% (81/109) |
| | **Total** | **516** | | | |

---

## OTT Breakdown by Mood

| OTT Platform | IMDb Top | Light & Fun | Bollywood | Oscar | SRK | **Total** |
|--------------|:--------:|:-----------:|:---------:|:-----:|:---:|:---------:|
| Netflix | 15 | 18 | 39 | 2 | 47 | **121** |
| Amazon Prime Video | 16 | 22 | 31 | 10 | 41 | **120** |
| Zee5 | 0 | 1 | 7 | 0 | 2 | **10** |
| MUBI | 0 | 2 | 0 | 0 | 0 | **2** |
| Lionsgate Play | 3 | 0 | 0 | 1 | 0 | **4** |
| | | | | | | |
| **With any OTT** | **34** | **29** | **69** | **12** | **81** | **225** |
| **No OTT** | **66** | **80** | **31** | **86** | **28** | **291** |

---

## Rating & Year Stats

| Mood | Avg Rating | Min | Max | Year Range |
|------|:----------:|:---:|:---:|:----------:|
| `imdb_top` | 8.4 | 8.2 | 8.7 | 1931 -- 2025 |
| `light_and_fun` | 7.1 | 6.0 | 8.2 | 1955 -- 2024 |
| `bollywood` | 7.1 | 5.7 | 8.5 | 1975 -- 2025 |
| `oscar` | 7.5 | 5.2 | 8.5 | 1927 -- 2024 |
| `srk` | 6.4 | 3.8 | 8.7 | 1989 -- 2026 |

---

## Cross-Mood Duplicates

These are the same movie appearing in multiple moods. This is expected and by design -- an SRK film can also be a Bollywood hit, an Oscar winner can also be IMDb top rated.

**Bollywood + SRK overlap:** DDLJ, My Name Is Khan, Devdas, Chak De! India, Swades, Om Shanti Om, Rab Ne Bana Di Jodi, K3G, KKHH, Kal Ho Naa Ho, Veer-Zaara, Jawan, Pathaan, Raees, Don, Don 2, Dilwale, Fan, Main Hoon Na, Jab Tak Hai Jaan, Happy New Year, Dear Zindagi, ADHM, JHMS, KANK, Chennai Express, Ra.One, Mohabbatein

**Oscar + IMDb Top overlap:** Parasite, Forrest Gump, The Godfather, Schindler's List, Gladiator, The Silence of the Lambs, One Flew Over the Cuckoo's Nest, LOTR: Return of the King, The Godfather Part II

---

## Notes

- Oscar mood has 98 movies because only 98 Best Picture winners exist in TMDB (1927--2024). This is the natural ceiling.
- 9 old-format `fun_*` IDs remain (`fun_1` to `fun_9`). These are valid unique movies not returned by the TMDB Comedy+Family genre query. They work fine but use a different ID scheme.
- OTT coverage is lowest for Oscar (12%) and IMDb Top (34%) due to many classic/international films not being available on Indian streaming platforms.
