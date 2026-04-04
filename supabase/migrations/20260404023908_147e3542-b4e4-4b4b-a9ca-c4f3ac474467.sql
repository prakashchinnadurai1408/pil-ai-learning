INSERT INTO storage.buckets (id, name, public) VALUES ('proctoring-photos', 'proctoring-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can upload proctoring photos"
ON storage.objects FOR INSERT TO public
WITH CHECK (bucket_id = 'proctoring-photos');

CREATE POLICY "Anyone can read proctoring photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'proctoring-photos');

CREATE TABLE IF NOT EXISTS public.proctoring_active_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  assessment_id uuid NOT NULL,
  session_id text NOT NULL,
  browser_info text NOT NULL DEFAULT '',
  last_heartbeat timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.proctoring_active_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert sessions" ON public.proctoring_active_sessions FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can read sessions" ON public.proctoring_active_sessions FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can update sessions" ON public.proctoring_active_sessions FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete sessions" ON public.proctoring_active_sessions FOR DELETE TO public USING (true);