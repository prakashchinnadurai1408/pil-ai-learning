// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  applyRealtimeEvent,
  createClockState,
  clockOf,
  type RealtimeEvent,
} from "../lessonRealtime";

interface L {
  id: string;
  generation_status: string;
  version?: number;
  updated_at?: string | null;
  last_regenerated_at?: string | null;
  retry_scheduled_at?: string | null;
  [k: string]: unknown;
}

const lesson = (over: Partial<L> & { id: string }): L => ({
  generation_status: "idle",
  updated_at: null,
  last_regenerated_at: null,
  retry_scheduled_at: null,
  ...over,
});

const evt = (over: Partial<RealtimeEvent<L>>): RealtimeEvent<L> => ({
  type: "UPDATE",
  ...over,
});

describe("clockOf", () => {
  it("prefers updated_at over other timestamps", () => {
    const t = clockOf({
      id: "a",
      generation_status: "idle",
      updated_at: "2026-04-22T10:00:00Z",
      last_regenerated_at: "2026-04-22T09:00:00Z",
    } as L, "2026-04-22T08:00:00Z");
    expect(t).toBe(Date.parse("2026-04-22T10:00:00Z"));
  });

  it("falls back to commit_timestamp when row has no clocks", () => {
    const t = clockOf({ id: "a", generation_status: "idle" } as L, "2026-04-22T10:00:00Z");
    expect(t).toBe(Date.parse("2026-04-22T10:00:00Z"));
  });

  it("returns 0 when nothing is available", () => {
    expect(clockOf(undefined, undefined)).toBe(0);
    expect(clockOf({ id: "a", generation_status: "idle" } as L)).toBe(0);
  });
});

describe("applyRealtimeEvent — ordering & de-duplication", () => {
  it("applies an INSERT event for a new lesson", () => {
    const state = createClockState();
    const r = applyRealtimeEvent(
      [],
      evt({
        type: "INSERT",
        new: lesson({ id: "L1", generation_status: "running", updated_at: "2026-04-22T10:00:00Z" }),
        eventId: "e1",
      }),
      state
    );
    expect(r.dropped).toBeNull();
    expect(r.lessons).toHaveLength(1);
    expect(r.lessons[0].generation_status).toBe("running");
    expect(r.state.clocks["L1"]).toBe(Date.parse("2026-04-22T10:00:00Z"));
  });

  it("merges UPDATE fields without losing existing ones", () => {
    const initial = [lesson({ id: "L1", generation_status: "running", version: 3, updated_at: "2026-04-22T10:00:00Z" })];
    const state = { clocks: { L1: Date.parse("2026-04-22T10:00:00Z") }, seenEventIds: new Set<string>() };

    const r = applyRealtimeEvent(
      initial,
      evt({
        new: { id: "L1", generation_status: "succeeded", updated_at: "2026-04-22T10:01:00Z" } as L,
        eventId: "e2",
      }),
      state
    );
    expect(r.dropped).toBeNull();
    expect(r.lessons[0].generation_status).toBe("succeeded");
    // version was not in the payload — it must be preserved
    expect(r.lessons[0].version).toBe(3);
  });

  it("drops a stale event that would regress the UI to an older state", () => {
    // Scenario: succeeded event arrived first; a delayed `running` event
    // (older clock) shows up afterwards. UI must NOT flip back to running.
    const initial = [lesson({ id: "L1", generation_status: "succeeded", updated_at: "2026-04-22T10:01:00Z" })];
    const state = { clocks: { L1: Date.parse("2026-04-22T10:01:00Z") }, seenEventIds: new Set<string>() };

    const r = applyRealtimeEvent(
      initial,
      evt({
        new: lesson({ id: "L1", generation_status: "running", updated_at: "2026-04-22T10:00:30Z" }),
        eventId: "e-late",
      }),
      state
    );

    expect(r.dropped).toBe("stale-clock");
    expect(r.lessons[0].generation_status).toBe("succeeded");
    // High-water mark must NOT regress.
    expect(r.state.clocks["L1"]).toBe(Date.parse("2026-04-22T10:01:00Z"));
  });

  it("drops an event with the same clock (<=) to avoid replays", () => {
    const initial = [lesson({ id: "L1", generation_status: "succeeded", updated_at: "2026-04-22T10:01:00Z" })];
    const state = { clocks: { L1: Date.parse("2026-04-22T10:01:00Z") }, seenEventIds: new Set<string>() };
    const r = applyRealtimeEvent(
      initial,
      evt({ new: lesson({ id: "L1", generation_status: "running", updated_at: "2026-04-22T10:01:00Z" }), eventId: "dup-clock" }),
      state
    );
    expect(r.dropped).toBe("stale-clock");
    expect(r.lessons[0].generation_status).toBe("succeeded");
  });

  it("drops an exact duplicate event id even when its clock would be newer", () => {
    const initial = [lesson({ id: "L1", generation_status: "running", updated_at: "2026-04-22T10:00:00Z" })];
    const state = { clocks: { L1: Date.parse("2026-04-22T10:00:00Z") }, seenEventIds: new Set(["e-once"]) };
    const r = applyRealtimeEvent(
      initial,
      evt({ new: lesson({ id: "L1", generation_status: "succeeded", updated_at: "2026-04-22T10:05:00Z" }), eventId: "e-once" }),
      state
    );
    expect(r.dropped).toBe("duplicate-event-id");
    expect(r.lessons[0].generation_status).toBe("running");
  });

  it("processes the full transition sequence failed → awaiting_retry → running → succeeded in order", () => {
    let state = createClockState();
    let lessons: L[] = [];

    const apply = (e: RealtimeEvent<L>) => {
      const r = applyRealtimeEvent(lessons, e, state);
      lessons = r.lessons;
      state = r.state;
      return r;
    };

    apply(evt({ type: "INSERT", new: lesson({ id: "L1", generation_status: "failed", updated_at: "2026-04-22T10:00:00Z" }), eventId: "e1" }));
    expect(lessons[0].generation_status).toBe("failed");

    apply(evt({ new: lesson({ id: "L1", generation_status: "failed", retry_scheduled_at: "2026-04-22T10:00:30Z", updated_at: "2026-04-22T10:00:01Z" }), eventId: "e2" }));
    expect(lessons[0].retry_scheduled_at).toBe("2026-04-22T10:00:30Z");

    apply(evt({ new: lesson({ id: "L1", generation_status: "running", retry_scheduled_at: null, updated_at: "2026-04-22T10:00:30Z" }), eventId: "e3" }));
    expect(lessons[0].generation_status).toBe("running");
    expect(lessons[0].retry_scheduled_at).toBeNull();

    apply(evt({ new: lesson({ id: "L1", generation_status: "succeeded", updated_at: "2026-04-22T10:01:00Z" }), eventId: "e4" }));
    expect(lessons[0].generation_status).toBe("succeeded");

    // Now replay an old "running" event — must be dropped, state must hold.
    const r = apply(evt({ new: lesson({ id: "L1", generation_status: "running", updated_at: "2026-04-22T10:00:30Z" }), eventId: "e3-replay" }));
    expect(r.dropped).toBe("stale-clock");
    expect(lessons[0].generation_status).toBe("succeeded");
  });

  it("handles DELETE for a known id and ignores DELETE for an unknown id", () => {
    let state = createClockState();
    let lessons: L[] = [lesson({ id: "L1", generation_status: "succeeded", updated_at: "2026-04-22T10:00:00Z" })];
    state.clocks["L1"] = Date.parse("2026-04-22T10:00:00Z");

    const r1 = applyRealtimeEvent(lessons, evt({ type: "DELETE", old: { id: "L1" } as L, eventId: "d1" }), state);
    expect(r1.dropped).toBeNull();
    expect(r1.lessons).toHaveLength(0);

    const r2 = applyRealtimeEvent(r1.lessons, evt({ type: "DELETE", old: { id: "ghost" } as L, eventId: "d2" }), r1.state);
    expect(r2.dropped).toBe("delete-unknown");
  });

  it("drops events with no id rather than throwing", () => {
    const r = applyRealtimeEvent([], evt({ new: { generation_status: "running" } as L }), createClockState());
    expect(r.dropped).toBe("missing-id");
  });

  it("keeps the lessons list bounded to maxLessons on insert", () => {
    let state = createClockState();
    let lessons: L[] = [];
    for (let i = 0; i < 10; i++) {
      const r = applyRealtimeEvent(
        lessons,
        evt({
          type: "INSERT",
          new: lesson({ id: `L${i}`, generation_status: "idle", updated_at: `2026-04-22T10:0${i}:00Z` }),
          eventId: `i${i}`,
        }),
        state,
        { maxLessons: 5 }
      );
      lessons = r.lessons;
      state = r.state;
    }
    expect(lessons).toHaveLength(5);
  });
});
