
ALTER TABLE assessments ADD COLUMN proctoring_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE public.proctoring_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL,
  assessment_id uuid NOT NULL,
  student_id uuid NOT NULL,
  student_name text NOT NULL DEFAULT '',
  event_type text NOT NULL,
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.proctoring_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert proctoring logs" ON public.proctoring_logs FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can read proctoring logs" ON public.proctoring_logs FOR SELECT TO public USING (true);

CREATE TABLE public.proctoring_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL UNIQUE,
  assessment_id uuid NOT NULL,
  student_id uuid NOT NULL,
  student_name text NOT NULL DEFAULT '',
  tab_switch_count integer NOT NULL DEFAULT 0,
  fullscreen_exit_count integer NOT NULL DEFAULT 0,
  face_not_detected_count integer NOT NULL DEFAULT 0,
  multiple_faces_count integer NOT NULL DEFAULT 0,
  eye_movement_violations integer NOT NULL DEFAULT 0,
  photos_captured integer NOT NULL DEFAULT 0,
  proctoring_score integer NOT NULL DEFAULT 100,
  status text NOT NULL DEFAULT 'Good',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.proctoring_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert proctoring summary" ON public.proctoring_summary FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can read proctoring summary" ON public.proctoring_summary FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can update proctoring summary" ON public.proctoring_summary FOR UPDATE TO public USING (true) WITH CHECK (true);
