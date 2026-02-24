# Image Analysis — Broken Poster Audit

**Audit date:** 2026-02-24  
**Total movies in DB:** 1000  
**Working posters:** 995 → **1000 (all fixed)**  
**Broken posters:** 5 → **0**

---

## Movies with Broken Poster Images (Fixed)

| DB ID | Title | Year | Mood | Old (Broken) URL | New (Working) URL | Source |
|-------|-------|------|------|------------------|-------------------|--------|
| `gritty_1` | The Rip | 2026 | `gritty_thrillers` | `.../r0Xm7t8Kow18B3S4N95T3E1nU0W.jpg` | `.../4wsYWH73Hb1B6noGIFaRQSAkuXj.jpg` | TMDB movie ID 1306368 |
| `gritty_2` | Kohrra S2 | 2026 | `gritty_thrillers` | `.../8tZYtuWezpWIKdwh1Mkt0tr9GYj.jpg` | `.../4YATqnRFjpPdr6l8kmiNLpqeGFy.jpg` | TMDB TV "Kohrra 2" ID 314239 |
| `latest_1` | The Night Agent S3 | 2026 | `latest` | `.../x11A0P4OQk9uFsqC3XhO687IqL5.jpg` | `.../4c5yUNcaff4W4aPrkXE6zr7papX.jpg` | TMDB TV show ID 129552 |
| `latest_2` | Panchayat S5 | 2026 | `latest` | `.../tVTiwqO3a8Ltsn4wL5uL26mXXcE.jpg` | `.../cPPhduQk1eX0MAE2JDaQRh3UZB5.jpg` | TMDB TV show ID 101352 |
| `quick_1` | The Wonderful Story of Henry Sugar | 2023 | `quick_watches` | `.../5R1xZ4m4UcwR9V9zV7MofS2q983.jpg` | `.../fDUywEHwHh6nsLnVXAdPN9m4ZUG.jpg` | TMDB movie ID 923939 |

All 5 poster URLs verified HTTP 200 before writing to DB.

---

## Notes

- All 5 broken entries were originally seeded via `scripts/seed-new-moods.ts` using **placeholder/dummy TMDB poster paths**.
- S3/S4/S5 seasons that don't have their own TMDB entries now use the parent show's poster (same image users recognise).
- `The Rip` (2026) does have a real TMDB movie entry (released Jan 2026).
- `The Wonderful Story of Henry Sugar` is a 2023 Netflix short — TMDB ID 923939 has the correct poster.
