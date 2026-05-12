## Background Export Jobs (Server-Side)

Move the trainer CSV/PDF export from in-browser pagination to a server-side background job that survives refreshes, persists progress in the database, and exposes accurate progress + truncation signals.

### 1. Database — `trainer_export_jobs` table

New table to durably track each export job:

- `id` uuid PK
- `trainer_email` text (owner; used in RLS)
- `format` text (`csv` | `pdf`)
- `filters` jsonb (date range, college, dept, search, etc.)
- `estimated_total` int (from pre-run count query)
- `hard_max` int (snapshot of cap, default 20000)
- `will_truncate` bool (estimated_total > hard_max)
- `rows_fetched` int default 0
- `pages_fetched` int default 0
- `cursor_created_at` timestamptz nullable (keyset cursor)
- `cursor_id` uuid nullable
- `status` text: `queued` | `running` | `done` | `canceled` | `error`
- `error_message` text
- `file_path` text (storage path when done)
- `file_size_bytes` bigint
- `download_url` text (signed URL, regenerated on demand)
- `created_at`, `updated_at`, `completed_at`

RLS: trainer can only see/update jobs where `trainer_email = current trainer email` (passed via SECURITY DEFINER RPC, matching existing pattern in `TrainerDiffAnalytics`).

Storage bucket: `trainer-exports` (private), files at `{trainer_email}/{job_id}.{csv|pdf}`.

### 2. Edge function — `trainer-export-runner`

POST `{ jobId, trainerEmail }`. Behavior:

1. Loads the job row, verifies ownership, sets `status='running'`.
2. Loops:
   - Builds the same filtered Supabase query the client uses, applying keyset cursor `(cursor_created_at, cursor_id)` for stable resume.
   - Fetches a page (1000 rows), appends to a streaming buffer (CSV writer or accumulated array for PDF).
   - Updates `rows_fetched`, `pages_fetched`, advances cursor — persisted every page.
   - Stops when no more rows OR `rows_fetched >= hard_max`.
3. On finish: uploads file to `trainer-exports` bucket, stores `file_path` + `file_size_bytes`, sets `status='done'`.
4. On error: writes `error_message`, `status='error'`. Cursor remains so a follow-up job can resume.
5. Honors a `cancel_requested` flag (polled each page) — sets `status='canceled'` and stops.

Function uses service role to bypass RLS for the data scan, but always filters by the job's owner-scoped filters.

### 3. Edge function — `trainer-export-download`

GET `{ jobId, trainerEmail }`. Verifies ownership, returns a fresh signed URL (60 min) for the stored file.

### 4. Frontend — `TrainerDiffAnalytics.tsx`

- Replace in-memory `fetchAllFiltered` export path with:
  1. POST to create job row (status `queued`, with filters + estimate).
  2. Invoke `trainer-export-runner` (fire-and-forget; do not await completion).
  3. Subscribe to the job row via Supabase Realtime (`trainer_export_jobs` channel filtered by `id`).
- Progress UI now reads `rows_fetched / estimated_total` from the realtime row, plus a truncation warning when `will_truncate` is true (badge in dialog).
- Dialog can be closed/minimized at any time — state lives in DB; reopening the panel resumes UI from the latest row.
- New "Recent exports" list (last 10 jobs) showing status, progress, and a Download button (calls `trainer-export-download`) for completed jobs. Cancel button writes `cancel_requested = true` via RPC.
- Resume-after-truncation: if a completed job has `will_truncate = true`, offer a "Continue from cursor" button that creates a new job seeded with the previous job's final cursor.

### 5. Cleanup

- Cron (daily): delete `trainer_export_jobs` rows + storage files older than 7 days.
- Realtime: enable on `trainer_export_jobs`.

### Files to add/edit

- New migration: `trainer_export_jobs` table, RLS, helper RPCs (`create_trainer_export_job`, `cancel_trainer_export_job`, `list_trainer_export_jobs`), `trainer-exports` storage bucket + policies, realtime publication, cleanup cron.
- New: `supabase/functions/trainer-export-runner/index.ts`
- New: `supabase/functions/trainer-export-download/index.ts`
- New: `src/components/trainer/TrainerExportJobsPanel.tsx` (recent jobs list + realtime progress)
- Edited: `src/components/trainer/TrainerDiffAnalytics.tsx` — swap client-side export for job creation + realtime subscription; keep CSV/PDF column shape consistent with current output.

### Out of scope

- Email-on-complete notifications.
- PDF rendering at >5k rows is heavy; runner will switch PDF jobs above ~5k rows to CSV automatically and flag it on the job row (`format_downgraded=true`) — surfaced in UI.
