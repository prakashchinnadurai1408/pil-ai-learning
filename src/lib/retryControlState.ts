// Pure helpers describing the enabled state + tooltip text for every
// retry/cancel control rendered by VideoMcqManager and CoordinatorDashboard.
//
// Centralising this lets us:
//   • snapshot test the exact UX for Admin vs Coordinator without rendering React
//   • guarantee tooltips always mention the required role + consequence
//   • keep the two dashboards perfectly in sync about which buttons are live
//
// IMPORTANT: this file is the source of truth. Components should import these
// helpers rather than reimplementing the disabled/title logic inline.

export type Role = "admin" | "coordinator";

export interface LessonControlInput {
  generationStatus: string;          // "idle" | "running" | "failed" | "succeeded" | …
  retryScheduledAt: string | null;   // ISO timestamp of next auto-retry, or null
  /** Override "now" for deterministic tests. */
  now?: number;
}

export interface ControlState {
  disabled: boolean;
  title: string;
  /** Stable kebab-case key so snapshot tests are easy to read. */
  reason:
    | "ok"
    | "role-coordinator"
    | "blocked-running"
    | "awaiting-retry"
    | "no-retry-scheduled"
    | "not-failed";
}

const ADMIN_ONLY_REGENERATE =
  "Admin role required. Re-generates MCQs from scratch — existing questions will be replaced.";
const ADMIN_ONLY_RETRY =
  "Admin role required. Triggers a fresh MCQ generation run for this lesson.";
const ADMIN_ONLY_CANCEL =
  "Admin role required. Cancels the scheduled auto-retry; the lesson stays in failed state until you retry manually.";
const COORDINATOR_TIP =
  "Requires the Admin role. Coordinators have read-only access — ask an admin to take this action.";
const RUNNING_TIP =
  "Blocked while MCQ regeneration is in progress. Wait for it to finish (or fail) before retrying or cancelling.";

const isRunning = (s: string) => s === "running";
const secondsUntil = (iso: string | null, now: number): number => {
  if (!iso) return 0;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.ceil((t - now) / 1000));
};

/** "Regenerate MCQs" button on a lesson row. */
export function regenerateControl(role: Role, l: LessonControlInput): ControlState {
  const now = l.now ?? Date.now();
  if (role !== "admin") return { disabled: true, title: COORDINATOR_TIP, reason: "role-coordinator" };
  if (isRunning(l.generationStatus)) return { disabled: true, title: RUNNING_TIP, reason: "blocked-running" };
  const sec = secondsUntil(l.retryScheduledAt, now);
  if (sec > 0) {
    return {
      disabled: true,
      title: `Auto-retry scheduled in ${sec}s — manual retry is locked until then. Cancel the auto-retry first if you want to retry now.`,
      reason: "awaiting-retry",
    };
  }
  return { disabled: false, title: ADMIN_ONLY_REGENERATE, reason: "ok" };
}

/** "Retry now" button shown on a failed lesson. */
export function retryNowControl(role: Role, l: LessonControlInput): ControlState {
  const now = l.now ?? Date.now();
  if (role !== "admin") return { disabled: true, title: COORDINATOR_TIP, reason: "role-coordinator" };
  if (isRunning(l.generationStatus)) return { disabled: true, title: RUNNING_TIP, reason: "blocked-running" };
  if (l.generationStatus !== "failed") {
    return { disabled: true, title: "Retry is only available for failed lessons.", reason: "not-failed" };
  }
  const sec = secondsUntil(l.retryScheduledAt, now);
  if (sec > 0) {
    return {
      disabled: true,
      title: `Auto-retry scheduled in ${sec}s — retry is locked until then.`,
      reason: "awaiting-retry",
    };
  }
  return { disabled: false, title: ADMIN_ONLY_RETRY, reason: "ok" };
}

/** "Cancel auto-retry" button — only meaningful when a retry is pending. */
export function cancelRetryControl(role: Role, l: LessonControlInput): ControlState {
  const now = l.now ?? Date.now();
  if (role !== "admin") return { disabled: true, title: COORDINATOR_TIP, reason: "role-coordinator" };
  if (isRunning(l.generationStatus)) return { disabled: true, title: RUNNING_TIP, reason: "blocked-running" };
  const sec = secondsUntil(l.retryScheduledAt, now);
  if (sec <= 0) {
    return { disabled: true, title: "No auto-retry is currently scheduled for this lesson.", reason: "no-retry-scheduled" };
  }
  return {
    disabled: false,
    title: `${ADMIN_ONLY_CANCEL} (Auto-retry fires in ${sec}s.)`,
    reason: "ok",
  };
}

/** "Cancel job" button shown while a generation run is in flight. */
export function cancelJobControl(role: Role, l: LessonControlInput): ControlState {
  if (role !== "admin") return { disabled: true, title: COORDINATOR_TIP, reason: "role-coordinator" };
  if (!isRunning(l.generationStatus)) {
    return { disabled: true, title: "No regeneration job is currently running for this lesson.", reason: "not-failed" };
  }
  // Today the build keeps Cancel-job as a placeholder (server-side cancel not wired yet).
  // We still return enabled=false but with an admin-specific tooltip so coordinators
  // and admins see the same explanation rather than the role gate.
  return { disabled: true, title: "Cancel job (Admin only) — not yet supported by the generation worker.", reason: "ok" };
}

export const ALL_CONTROLS = {
  regenerate: regenerateControl,
  retryNow: retryNowControl,
  cancelRetry: cancelRetryControl,
  cancelJob: cancelJobControl,
} as const;
