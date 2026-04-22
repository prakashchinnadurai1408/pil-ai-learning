// Pure helpers for applying realtime (Postgres CDC / SSE) events to the lesson
// list, with strict ordering & de-duplication guarantees.
//
// Why this exists:
//   Supabase Realtime can deliver events out of order when reconnects happen, or
//   when the optimistic UI update races against the websocket broadcast of the
//   same change. Without protection the UI can briefly regress to an older
//   state (e.g. flicker back to "running" after we already saw "succeeded").
//
// Strategy:
//   Each row carries a monotonically-increasing logical clock = the most recent
//   server-side mutation timestamp. We use `updated_at` when present, otherwise
//   fall back to `last_regenerated_at`, and finally the event's `commit_timestamp`.
//   We keep a per-id high-water mark and silently drop any incoming event whose
//   clock is <= the stored mark. We also drop exact duplicates (same event id).
//
// This module is framework-agnostic and side-effect free so it can be unit
// tested without React / Supabase / jsdom.
//
// Used by: src/components/admin/VideoMcqManager.tsx
//          src/components/admin/CoordinatorDashboard.tsx

export interface LessonLike {
  id: string;
  generation_status?: string;
  status?: string;
  version?: number;
  last_regenerated_at?: string | null;
  retry_scheduled_at?: string | null;
  updated_at?: string | null;
  [k: string]: unknown;
}

export type RealtimeEventType = "INSERT" | "UPDATE" | "DELETE";

export interface RealtimeEvent<T extends LessonLike = LessonLike> {
  /** Stable event id — when supplied, used to drop exact duplicates. */
  eventId?: string;
  type: RealtimeEventType;
  /** Server-issued commit timestamp (ISO). Used as a fallback clock. */
  commitTimestamp?: string;
  new?: T;
  old?: T;
}

/** Tracks per-lesson state for ordering & dedup. */
export interface LessonClockState {
  /** Highest logical-clock value (ms since epoch) we've already applied. */
  clocks: Record<string, number>;
  /** Set of event ids we've already applied (bounded). */
  seenEventIds: Set<string>;
}

export const createClockState = (): LessonClockState => ({
  clocks: {},
  seenEventIds: new Set(),
});

const MAX_SEEN = 500;

/**
 * Extract a logical clock (ms) from a row, preferring the most reliable
 * server-stamped field available. Falls back to 0 so any real timestamp wins.
 */
export function clockOf(row: LessonLike | undefined, commitTs?: string): number {
  if (!row && !commitTs) return 0;
  const candidates = [
    row?.updated_at,
    row?.last_regenerated_at,
    commitTs,
  ].filter(Boolean) as string[];
  let best = 0;
  for (const c of candidates) {
    const t = Date.parse(c);
    if (!Number.isNaN(t) && t > best) best = t;
  }
  return best;
}

export interface ApplyResult<T extends LessonLike> {
  lessons: T[];
  state: LessonClockState;
  /**
   * Why the event was dropped (if it was). Useful for tests + debugging.
   * `null` when the event was applied.
   */
  dropped: null | "duplicate-event-id" | "stale-clock" | "missing-id" | "delete-unknown";
}

/**
 * Apply one realtime event to the lessons list, enforcing:
 *   • exact duplicate event ids are ignored
 *   • events with a clock <= the stored high-water mark for that id are ignored
 *   • DELETE for an unknown id is a no-op (not an error)
 *
 * Returns a NEW lessons array + NEW state object — never mutates inputs.
 */
export function applyRealtimeEvent<T extends LessonLike>(
  lessons: T[],
  event: RealtimeEvent<T>,
  state: LessonClockState,
  opts?: { maxLessons?: number }
): ApplyResult<T> {
  const max = opts?.maxLessons ?? 50;
  const row = event.new ?? event.old;
  const id = row?.id;

  if (!id) {
    return { lessons, state, dropped: "missing-id" };
  }

  // 1. Exact duplicate event id — drop without touching the clock.
  if (event.eventId && state.seenEventIds.has(event.eventId)) {
    return { lessons, state, dropped: "duplicate-event-id" };
  }

  // 2. Stale clock check (only meaningful when we already know this id).
  const incomingClock = clockOf(row, event.commitTimestamp);
  const knownClock = state.clocks[id] ?? 0;
  if (knownClock > 0 && incomingClock > 0 && incomingClock <= knownClock) {
    // Still record the event id so a true duplicate doesn't come back later.
    const seen = rememberEventId(state.seenEventIds, event.eventId);
    return {
      lessons,
      state: { clocks: state.clocks, seenEventIds: seen },
      dropped: "stale-clock",
    };
  }

  // 3. Apply.
  let nextLessons = lessons;
  if (event.type === "DELETE") {
    const idx = lessons.findIndex((l) => l.id === id);
    if (idx === -1) {
      return { lessons, state, dropped: "delete-unknown" };
    }
    nextLessons = lessons.filter((l) => l.id !== id);
  } else {
    const idx = lessons.findIndex((l) => l.id === id);
    if (idx === -1) {
      // INSERT or first-seen UPDATE → prepend, keep list bounded.
      nextLessons = [row as T, ...lessons].slice(0, max);
    } else {
      // Merge so partial updates don't wipe other fields.
      const merged = { ...lessons[idx], ...(row as T) };
      nextLessons = [...lessons];
      nextLessons[idx] = merged;
    }
  }

  const nextClocks = { ...state.clocks };
  if (incomingClock > 0) nextClocks[id] = incomingClock;
  const nextSeen = rememberEventId(state.seenEventIds, event.eventId);

  return {
    lessons: nextLessons,
    state: { clocks: nextClocks, seenEventIds: nextSeen },
    dropped: null,
  };
}

function rememberEventId(seen: Set<string>, eventId?: string): Set<string> {
  if (!eventId) return seen;
  if (seen.has(eventId)) return seen;
  const next = new Set(seen);
  next.add(eventId);
  // Bound the set so a long-running session doesn't grow unboundedly.
  if (next.size > MAX_SEEN) {
    const overflow = next.size - MAX_SEEN;
    let removed = 0;
    for (const v of next) {
      if (removed >= overflow) break;
      next.delete(v);
      removed++;
    }
  }
  return next;
}
