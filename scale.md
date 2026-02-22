# CineMatch Scalability Plan (100 Concurrent Users)

Let's refine how the app handles 100 people playing at the exact same time, by breaking down our current assumptions and exposing the hidden gaps in the logic.

## 1. The Supabase Connection Limit (Realtime)
**The Initial Assumption:** Moving to the Pro Plan (500 connections) solves the issue for 100 concurrent users (who would use 100 connections).
**The Gap:** Supabase defines a "concurrent connection" per active WebSocket. However, modern browsers and React often mount, unmount, and duplicate connections during navigation or strict mode rendering. 
- *Edge Case:* If a user refreshes the page or their phone briefly loses signal, the old socket might hang open on the server until it times out, temporarily consuming *two* connection slots per user. 100 users with flaky internet could easily spike above 100 WebSocket connections.
**The Refined Fix:** We must ensure robust WebSocket cleanup in `useEffect` return statements in the room component, and manually disconnect the user's presence/channel when they navigate away to the shortlist.

## 2. Database Write Volume (Swiping)
**The Initial Assumption:** Batching swipes (e.g., sending 5-10 at a time) solves the write volume issue.
**The Gap (The "Loss of Nudge" Problem):** Our MVP's core engagement mechanic is the "Mutual Match Nudge". 
- In Dual Mode, if Player A swipes "Right" and we batch it inside their phone for 10 seconds, Player B will not see a Realtime Match animation or get the Nudge Overlay until Player A decides to flush their batch. 
- *Edge Case:* What if Player A closes the app before the batch is sent? The data is permanently lost.
**The Refined Fix:** We cannot arbitrarily batch *all* swipes in Dual mode without breaking the real-time feedback loop. 
- **Solo Mode:** Full batching is perfectly safe. We can even save everything in `sessionStorage` and send one massive payload at the end.
- **Dual Mode:** We must still send "Right" (Like) swipes immediately so the partner gets the instant match notification. However, "Left" (Pass) swipes are useless to the partner. We can safely batch all "Left" swipes or simply not write them to the database at all (track them locally to know when the deck is empty) to cut our database writes in half globally.

## 3. Caching the "Movies" List (Loading the Deck)
**The Initial Assumption:** Caching the 100 curated movies so the database is only hit once.
**The Gap (The Shuffle Paradox):** In Dual mode, both players *must* see the exact same sequence of movies.
- We currently rely on a `room.seed` inserted into the database to synchronize the shuffle. If the movie payload is cached globally, that's fine, but the *custom filtered deck* based on the exact combination of Player A + Player B's mood and OTT platforms is highly dynamic. 
- *Edge Case:* If we aggressively cache the payload, we must ensure the cache key correctly accounts for OTT selections and mood combinations without accidentally serving Player B the wrong filtered list.
**The Refined Fix:** We aggressively cache the *base* movies payload at the Edge (Vercel) using Next.js caching. However, the exact intersection of "Player A OTT preferences + Player B Mood" and the seeded shuffle must occur purely on the client side (after downloading the cached base payload) to ensure zero database locking without breaking the shared seed logic.

## 4. Images & Posters (Next.js Image Limits)
**The Initial Assumption:** Next.js `<Image>` component automatically optimizes everything perfectly.
**The Gap:** Vercel's Edge Image Optimization takes time to process an image on its *first* hit. 
- *Edge Case:* If 100 users simultaneously hit a fresh room, the top card (e.g., *Inception*) might be requested in 100 different viewport formats instantly. Vercel will attempt to optimize that massive TMDB image on the fly, causing a visual "pop-in" delay for the very first swipe where the crucial 3-second timer is already ticking.
**The Refined Fix:** We should configure Next.js to aggressively pre-warm the image cache for the top 10 movies in our curated list during the Build Phase, or ensure we pass `unoptimized={true}` for the immediate first card if we detect the user is on an ultrafast 5G connection, trading bandwidth for a guaranteed zero-delay paint.

---

**Refined Next Steps for Code:**
If you want to make the app bulletproof for 100 users, our next coding jobs are:
1. **Differentiated Sweeps:** Send "Right" swipes instantly (for real-time nudges), but batch or drop "Left" swipes to immediately cut DB writes by 50-80%.
2. **Edge Payload Caching:** Cache the raw movie JSON at the edge, but handle all the complex filtering/shuffling client-side.
3. **Socket Cleanup:** Add aggressive unmount/disconnect logic to the Realtime channels so ghost connections don't eat your limits.
