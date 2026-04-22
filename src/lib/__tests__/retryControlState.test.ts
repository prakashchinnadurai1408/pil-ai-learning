// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  regenerateControl,
  retryNowControl,
  cancelRetryControl,
  cancelJobControl,
  type Role,
  type LessonControlInput,
} from "../retryControlState";

// Fixed "now" so countdowns in titles are deterministic for snapshots.
const NOW = Date.parse("2026-04-22T10:00:00Z");
const inSeconds = (s: number) => new Date(NOW + s * 1000).toISOString();

const SCENARIOS: { name: string; lesson: LessonControlInput }[] = [
  { name: "idle (no retry scheduled)", lesson: { generationStatus: "idle", retryScheduledAt: null, now: NOW } },
  { name: "running", lesson: { generationStatus: "running", retryScheduledAt: null, now: NOW } },
  { name: "failed (no retry scheduled)", lesson: { generationStatus: "failed", retryScheduledAt: null, now: NOW } },
  { name: "failed + auto-retry in 30s", lesson: { generationStatus: "failed", retryScheduledAt: inSeconds(30), now: NOW } },
  { name: "failed + auto-retry already due", lesson: { generationStatus: "failed", retryScheduledAt: inSeconds(-5), now: NOW } },
  { name: "succeeded", lesson: { generationStatus: "succeeded", retryScheduledAt: null, now: NOW } },
];

const ROLES: Role[] = ["admin", "coordinator"];

describe("retry/cancel control state — snapshot per role × scenario", () => {
  for (const role of ROLES) {
    for (const sc of SCENARIOS) {
      it(`${role} | ${sc.name}`, () => {
        const snap = {
          regenerate: regenerateControl(role, sc.lesson),
          retryNow: retryNowControl(role, sc.lesson),
          cancelRetry: cancelRetryControl(role, sc.lesson),
          cancelJob: cancelJobControl(role, sc.lesson),
        };
        expect(snap).toMatchSnapshot();
      });
    }
  }

  it("coordinator tooltips ALWAYS mention the Admin role requirement", () => {
    for (const sc of SCENARIOS) {
      const all = [
        regenerateControl("coordinator", sc.lesson),
        retryNowControl("coordinator", sc.lesson),
        cancelRetryControl("coordinator", sc.lesson),
        cancelJobControl("coordinator", sc.lesson),
      ];
      for (const c of all) {
        expect(c.disabled).toBe(true);
        expect(c.title.toLowerCase()).toMatch(/admin/);
      }
    }
  });

  it("admin retry stays disabled while a job is running, with the running-block tooltip", () => {
    const c = retryNowControl("admin", { generationStatus: "running", retryScheduledAt: null, now: NOW });
    expect(c.disabled).toBe(true);
    expect(c.reason).toBe("blocked-running");
    expect(c.title).toMatch(/Blocked while MCQ regeneration/i);
  });

  it("admin retry stays disabled while an auto-retry is scheduled and shows the countdown", () => {
    const c = retryNowControl("admin", { generationStatus: "failed", retryScheduledAt: inSeconds(42), now: NOW });
    expect(c.disabled).toBe(true);
    expect(c.reason).toBe("awaiting-retry");
    expect(c.title).toMatch(/42s/);
  });

  it("admin cancel-retry is enabled iff a future retry is scheduled and includes the countdown", () => {
    const enabled = cancelRetryControl("admin", { generationStatus: "failed", retryScheduledAt: inSeconds(15), now: NOW });
    expect(enabled.disabled).toBe(false);
    expect(enabled.title).toMatch(/15s/);

    const disabled = cancelRetryControl("admin", { generationStatus: "failed", retryScheduledAt: null, now: NOW });
    expect(disabled.disabled).toBe(true);
    expect(disabled.reason).toBe("no-retry-scheduled");
  });

  it("admin retry-now becomes enabled once the auto-retry countdown is in the past and status is failed", () => {
    const c = retryNowControl("admin", { generationStatus: "failed", retryScheduledAt: inSeconds(-1), now: NOW });
    expect(c.disabled).toBe(false);
    expect(c.reason).toBe("ok");
  });
});
