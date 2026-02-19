CineMatch PRD (MVP v1.0)

1. Objective

Solve choice paralysis in movie selection using time-constrained swiping and nudge mechanics.

2. Core Constraints

Time Limit: 3-minute hard countdown.

Modes: Solo (Single) or Synchronous (Dual).

Hard Redirect: Timer expiry = Immediate navigation to Shortlist.

Visual Reference: Design Reference

3. User Flow & Mechanics

3.1 Visual & UX Logic

Swipe Session (S4): Clean card stack. The top card is active; background cards are visible but non-interactable. No blur during swiping to maintain high-speed visibility.

Shortlist Screen (S6): Focus Blur Mechanic. When reviewing the shortlist, one movie title is highlighted/active while the others are blurred to prevent secondary choice paralysis.

3.2 Mode Selection & Randomization

Pool Logic: - Single: 100 movies.

Dual (OR Logic): User A Mode + User B Mode (~200 movies).

Deterministic Interleaving: The pool is merged using a consistent pattern (e.g., interleaving A and B) before the shuffle.

Sequencing: A shared random seed is generated at room creation so both users see the exact same movie sequence in Dual Mode.

3.3 Dual Mode "Mutual Interest"

Match Header: A real-time "Mutual Likes" bar at the top displays thumbnails of movies both users have right-swiped.

Nudge Persistence: If User A clicks "See Shortlist" but User B clicks "Continue," the session continues for both. Users only exit if both agree or timer hits 0:00.

4. Screen Inventory

ID

Screen

Key Elements

S1

Landing

"Enter" CTA.

S2

Mode Select

Selection of curated movie categories.

S3

Room (Dual)

Shareable code, "Ready" toggle, started_at sync.

S4

Swipe

Mutual Likes Bar, 3:00 Timer, Clean Stack, Highlighted Active Title.

S5

Nudge

Overlay: "Continue" vs "Watch Now".

S6

Shortlist

Blurred focus list, "Decide for Me" button, OTT Watch Links.

5. Technical Requirements (The "Sharp" Readiness)

5.1 Realtime & Sync

Timer Sync: Clients calculate remaining time based on a started_at timestamp from the Supabase room record to prevent clock drift between devices.

State Reliability: Use Supabase Presence to track "Likes" arrays. Presence automatically handles re-syncing if a user has a momentary network flicker.

Broadcast: Used for immediate UI triggers like "Match!" animations.

5.2 Persistence & Performance

Refresh Protection: Current session state (swipes/matches) is stored in sessionStorage. Refreshing the browser allows the user to re-sync with the active room instantly.

Buffer Loader: The app silently pre-loads the next 5-10 movie posters in the background to ensure zero lag during high-speed swiping.

6. Edge Cases

Disconnect: Remaining user is notified; session converts to Solo logic.

Zero Matches: Shortlist shows "No overlap found" with a "Try Again" CTA.

Exhaustion: Auto-redirect to Shortlist if the pool ends before 0:00.