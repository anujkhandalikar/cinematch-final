export const GA_MEASUREMENT_ID = "G-739G9BV5YY";
export const GA_SECONDARY_ID = "G-L2HJGTRJ8R";

type GTagEvent = {
  action: string;
  category?: string;
  label?: string;
  value?: number;
  [key: string]: string | number | boolean | string[] | undefined;
};

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

function gtag(...args: unknown[]) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag(...args);
  }
}

export function trackEvent({ action, category, label, value, ...rest }: GTagEvent) {
  gtag("event", action, {
    event_category: category,
    event_label: label,
    value,
    ...rest,
  });
}

export function trackPageView(path: string) {
  gtag("config", GA_MEASUREMENT_ID, { page_path: path });
  gtag("config", GA_SECONDARY_ID, { page_path: path });
}

// ──────────────────────────────────────────
// ACQUISITION
// ──────────────────────────────────────────

export function trackLandingCTA(cta: "kill_the_scroll" | "how_it_works") {
  trackEvent({ action: "landing_cta_click", category: "acquisition", cta });
}

// ──────────────────────────────────────────
// NAVIGATION
// ──────────────────────────────────────────

export function trackNavBack(from: string) {
  trackEvent({ action: "nav_back", category: "navigation", from });
}

// ──────────────────────────────────────────
// FUNNEL
// ──────────────────────────────────────────

export function trackModeSelected(mode: "solo" | "dual") {
  trackEvent({ action: "mode_selected", category: "funnel", mode });
}

export function trackMoodSelected(mood: string) {
  trackEvent({ action: "mood_selected", category: "funnel", mood });
}

export function trackOttToggled(provider: string, selected: boolean) {
  trackEvent({ action: "ott_toggled", category: "funnel", provider, selected });
}

export function trackOttSelected(providers: string[]) {
  trackEvent({
    action: "ott_selected",
    category: "funnel",
    label: providers.join(", "),
    count: providers.length,
  });
}

export function trackOttSkipped() {
  trackEvent({ action: "ott_skipped", category: "funnel" });
}

// ──────────────────────────────────────────
// SESSION LIFECYCLE
// ──────────────────────────────────────────

export function trackSessionStart(params: {
  mode: "solo" | "dual";
  mood?: string;
  ott_count?: number;
  movie_count?: number;
  room_code?: string;
}) {
  trackEvent({ action: "session_start", category: "engagement", ...params });
}

export function trackSessionComplete(params: {
  mode: "solo" | "dual";
  liked_count: number;
  time_remaining: number;
  completion: "timer" | "manual" | "deck_empty";
}) {
  trackEvent({ action: "session_complete", category: "engagement", ...params });
}

// ──────────────────────────────────────────
// SWIPE & CARD INTERACTION
// ──────────────────────────────────────────

export function trackSwipe(params: {
  direction: "left" | "right";
  movie_id: string;
  movie_title: string;
  position?: number;
  mode?: "solo" | "dual";
}) {
  trackEvent({ action: "swipe", category: "engagement", ...params });
}

export function trackSynopsisOpen(movie_id: string, movie_title: string) {
  trackEvent({ action: "synopsis_open", category: "engagement", movie_id, movie_title });
}

export function trackSynopsisClose(movie_id: string) {
  trackEvent({ action: "synopsis_close", category: "engagement", movie_id });
}

// ──────────────────────────────────────────
// NUDGE OVERLAY
// ──────────────────────────────────────────

export function trackNudgeShown(liked_count: number, mode: "solo" | "dual") {
  trackEvent({ action: "nudge_shown", category: "engagement", liked_count, mode });
}

export function trackNudgeContinue(liked_count: number) {
  trackEvent({ action: "nudge_continue", category: "engagement", liked_count });
}

export function trackNudgeCheckShortlist(liked_count: number) {
  trackEvent({ action: "nudge_check_shortlist", category: "engagement", liked_count });
}

// ──────────────────────────────────────────
// DUAL MODE
// ──────────────────────────────────────────

export function trackRoomCreated(room_code: string) {
  trackEvent({ action: "dual_room_created", category: "engagement", room_code });
}

export function trackRoomJoined(room_code: string) {
  trackEvent({ action: "dual_room_joined", category: "engagement", room_code });
}

export function trackRoomCodeCopied(room_code: string) {
  trackEvent({ action: "room_code_copied", category: "engagement", room_code });
}

export function trackRoomShared(room_code: string) {
  trackEvent({ action: "room_shared", category: "engagement", room_code });
}

export function trackPlayerReady(room_code: string, is_ready: boolean) {
  trackEvent({ action: "player_ready", category: "engagement", room_code, is_ready });
}

export function trackMutualMatch(room_code: string, match_count: number) {
  trackEvent({ action: "mutual_match", category: "engagement", room_code, match_count });
}

// ──────────────────────────────────────────
// AI SEARCH
// ──────────────────────────────────────────

export function trackAiSearchSubmitted(query: string) {
  trackEvent({ action: "ai_search_submitted", category: "ai_search", query });
}

export function trackAiSearchSessionStarted(query: string) {
  trackEvent({ action: "ai_search_session_started", category: "ai_search", query });
}

export function trackAiSearchSuccess(query: string) {
  trackEvent({ action: "ai_search_success", category: "ai_search", query });
}

export function trackAiSearchError(query: string) {
  trackEvent({ action: "ai_search_error", category: "ai_search", query });
}

// ──────────────────────────────────────────
// MOOD PILL
// ──────────────────────────────────────────

export function trackMoodPillClick(mood_id: string, mood_label: string) {
  trackEvent({ action: "mood_pill_click", category: "engagement", mood_id, mood_label });
}

// ──────────────────────────────────────────
// SHUFFLE
// ──────────────────────────────────────────

export function trackShuffleClicked() {
  trackEvent({ action: "shuffle_clicked", category: "engagement" });
}

// ──────────────────────────────────────────
// RESULTS
// ──────────────────────────────────────────

export function trackResultsViewed(mode: "solo" | "dual", liked_count: number) {
  trackEvent({ action: "results_viewed", category: "engagement", mode, liked_count });
}

export function trackResultMovieClick(movie_id: string, movie_title: string) {
  trackEvent({ action: "result_movie_click", category: "engagement", movie_id, movie_title });
}

export function trackResultsHome(liked_count: number) {
  trackEvent({ action: "results_home", category: "engagement", liked_count });
}

export function trackResultsStartOver() {
  trackEvent({ action: "results_start_over", category: "engagement" });
}
