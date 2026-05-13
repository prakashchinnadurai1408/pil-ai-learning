ALTER TABLE public.video_lessons
  ADD COLUMN IF NOT EXISTS original_transcript text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS transcript_updated_at timestamptz;

UPDATE public.video_lessons
   SET original_transcript = COALESCE(NULLIF(original_transcript, ''), COALESCE(transcript, '')),
       transcript_updated_at = COALESCE(transcript_updated_at, updated_at, created_at)
 WHERE original_transcript = '' OR transcript_updated_at IS NULL;