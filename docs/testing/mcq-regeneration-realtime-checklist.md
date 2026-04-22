# MCQ Regeneration — Realtime & Role-Gating Test Checklist

End-to-end verification that the `video_lessons` realtime channel correctly
drives state transitions (`failed → awaiting_retry → running → succeeded`)
**and** that every retry/cancel control enables or disables exactly as
specified for the **Admin** vs **Coordinator** roles.

> Run this checklist after any change to:
> - `src/components/admin/VideoMcqManager.tsx`
> - `src/components/admin/CoordinatorDashboard.tsx`
> - `supabase/functions/generate-video-mcqs/*`
> - migrations touching `video_lessons.retry_scheduled_at` /
>   `generation_status` / publication membership.

---

## 0. Setup

| # | Action | Expected |
|---|--------|----------|
| 0.1 | Open **two browser windows**: `A` logged in as **Admin**, `B` logged in as **Coordinator** (moderator role). | Both reach the dashboard without errors. |
| 0.2 | In `A`: open **Admin → Video → MCQ Manager**. In `B`: open **Coordinator Operations**. | Both panels list the same lesson set; "Last refreshed" timestamp visible in `B`. |
| 0.3 | Pick a test lesson with ≥2 chapters and note its `id` and `version`. | Test target identified. |

---

## 1. Realtime transition: `idle → running`

| # | Action | Expected in window A (Admin) | Expected in window B (Coordinator) |
|---|--------|-------------------------------|-------------------------------------|
| 1.1 | In `A`, click **Regenerate MCQs** on the test lesson. | Row flips to `Running` badge with spinner **within 1s** (no manual refresh). Retry & Cancel buttons become disabled with tooltip *"Blocked while MCQ regeneration is in progress…"*. | Lesson appears in **Live regeneration** card **within 1s**. "Active regeneration jobs" stat increments. Progress bar renders. Cancel button shows lock + *"Admin only"*. |
| 1.2 | Watch elapsed-time label. | Updates every second (`Xs` then `1m Ys`). | Same — `running for Xs` updates live. |

✅ Pass criteria: state change propagates to **both** windows in under 1.5s without polling.

---

## 2. Realtime transition: `running → failed`

Trigger a failure (easiest: temporarily break the edge function, or use a
lesson with an invalid `youtube_video_id`).

| # | Action | Expected in A | Expected in B |
|---|--------|---------------|---------------|
| 2.1 | Job fails server-side. | Row flips to `Failed` with red badge **within 1s**. `generation_error` text visible. Retry button re-enables (Admin). | Lesson moves out of **Live regeneration**, into **Recently failed lessons** table. "Active jobs" decrements, "Recently failed" increments. |
| 2.2 | Hover Retry button in A. | Tooltip: *"Admin role required. Triggers a fresh MCQ generation run for this lesson."* | N/A |
| 2.3 | Hover Retry button in B. | N/A | Disabled; tooltip: *"Requires the Admin role. Coordinators have read-only access…"*. Lock icon visible. |

---

## 3. Realtime transition: `failed → awaiting_retry`

The server schedules an exponential-backoff retry by writing
`retry_scheduled_at` (future timestamp).

| # | Action | Expected in A | Expected in B |
|---|--------|---------------|---------------|
| 3.1 | Wait for backoff scheduling (or simulate via SQL: `update video_lessons set retry_scheduled_at = now() + interval '60 seconds' where id = '…'`). | Row shows **"awaiting retry"** badge with countdown `Auto-retry in 0:59` decrementing **every second**. Retry button **disabled**; tooltip includes remaining seconds: *"Auto-retry scheduled in 59s — retry is locked until then."* | Lesson appears in **Awaiting auto-retry** stat (count = 1). Failed-lessons table row gains *"awaiting retry"* badge. Filter `Lesson status = Awaiting retry` returns it. |
| 3.2 | In `A`, click **Cancel auto-retry**. Confirmation dialog must show the live countdown. | Dialog displays `"Cancel the auto-retry scheduled in Xs?"`. Confirming clears `retry_scheduled_at` server-side. Badge disappears in **both** windows within 1s. Retry re-enables. | Awaiting-retry stat drops to 0 in real time. |
| 3.3 | Re-schedule retry, then in `B` attempt to click Cancel auto-retry. | N/A | Button disabled with lock icon; tooltip: *"Requires the Admin role…"*. |

---

## 4. Realtime transition: `awaiting_retry → running` (auto)

| # | Action | Expected in A | Expected in B |
|---|--------|---------------|---------------|
| 4.1 | Let the countdown reach 0 (or set `retry_scheduled_at = now() - interval '1 second'`). | Within ≤2s the row transitions to `Running`, spinner appears, controls disable as in §1. `retry_scheduled_at` cleared. | Lesson moves from **Awaiting retry** back to **Live regeneration**. Stats update without refresh. |

---

## 5. Realtime transition: `running → succeeded`

| # | Action | Expected in A | Expected in B |
|---|--------|---------------|---------------|
| 5.1 | Allow generation to finish successfully. | Row shows `Ready` (or equivalent success state). `version` increments by 1. `generation_error` clears. Retry button shows tooltip *"Re-generates MCQs from scratch (Admin only). Existing questions will be replaced."*. | Lesson disappears from **Live regeneration** ("No regeneration jobs are currently running."). "Active jobs" stat returns to 0. "Last refreshed" updates. |
| 5.2 | Verify question count in DB matches sum of generated chapters. | `select count(*) from video_lesson_questions where lesson_id = '…'` matches `live questions saved` shown in B during run. | — |

---

## 6. Role-gating matrix (Admin `A` vs Coordinator `B`)

For each control, verify **enabled state** and **tooltip text** exactly:

| Control (location) | Admin enabled? | Coordinator enabled? | Coordinator tooltip must mention |
|--------------------|:--------------:|:--------------------:|----------------------------------|
| Regenerate MCQs (VideoMcqManager) | ✅ | ❌ (lock icon) | "Admin role" |
| Retry now (failed lesson) | ✅ when not running & no pending retry | ❌ | "Admin role" |
| Retry now (awaiting retry) | ❌ (countdown lock) | ❌ | Countdown seconds + "Admin role" |
| Cancel auto-retry | ✅ when `retry_scheduled_at` future | ❌ | "Admin role" |
| Cancel job (running) | (N/A in current build — always disabled) | ❌ | "Admin only" |
| Approve/Reject trainer | ✅ | ❌ | "Admin role" |
| Filters (search, status, date) | ✅ | ✅ (read-only filters allowed) | — |
| Refresh button | ✅ | ✅ | — |

**Failure if**: a Coordinator can click any mutating control, OR any tooltip omits the role requirement.

---

## 7. Realtime resilience

| # | Action | Expected |
|---|--------|----------|
| 7.1 | In window B, open DevTools → Network → filter `realtime`. Confirm a websocket to `…/realtime/v1/websocket` is `101 Switching Protocols`. | Connection is open and stays open across transitions. |
| 7.2 | Disable network in B for 10s, then re-enable. | On reconnect, the next state change still propagates within ≤4s (fallback poll covers the gap). |
| 7.3 | Hard-refresh B during a `running` job. | Live regeneration card rehydrates from initial load, then continues updating live without a second refresh. |

---

## 8. SQL invariants (run after the suite)

```sql
-- No lesson should be running with a future retry scheduled
select id from video_lessons
where generation_status = 'running' and retry_scheduled_at > now();
-- Expected: 0 rows

-- No succeeded lesson should still carry a generation_error or pending retry
select id from video_lessons
where generation_status not in ('failed','running')
  and (coalesce(generation_error,'') <> '' or retry_scheduled_at is not null);
-- Expected: 0 rows

-- Realtime publication membership
select tablename from pg_publication_tables
where pubname = 'supabase_realtime' and tablename = 'video_lessons';
-- Expected: 1 row
```

---

## 9. Sign-off

- [ ] §1–5 transitions all propagate to both windows in <1.5s without manual refresh
- [ ] §6 role matrix matches exactly (no Coordinator mutation possible)
- [ ] §7 websocket stays healthy; reconnect works
- [ ] §8 SQL invariants return 0 rows / 1 row as specified

Tester: ____________________  Date: __________  Build/SHA: __________
