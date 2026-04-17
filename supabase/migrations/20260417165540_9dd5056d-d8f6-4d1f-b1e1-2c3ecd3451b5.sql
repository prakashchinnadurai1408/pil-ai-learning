
CREATE TABLE public.path_regeneration_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  frequency text NOT NULL DEFAULT 'weekly',
  last_run_at timestamp with time zone,
  last_run_count integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by text NOT NULL DEFAULT 'admin'
);

ALTER TABLE public.path_regeneration_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read regen settings" ON public.path_regeneration_settings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert regen settings" ON public.path_regeneration_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update regen settings" ON public.path_regeneration_settings FOR UPDATE USING (true) WITH CHECK (true);

INSERT INTO public.path_regeneration_settings (enabled) VALUES (false);

CREATE TABLE public.candidate_diagnostic_results (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id uuid NOT NULL,
  candidate_name text NOT NULL DEFAULT '',
  score integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 10,
  correct_answers integer NOT NULL DEFAULT 0,
  topic_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  taken_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.candidate_diagnostic_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read diagnostic results" ON public.candidate_diagnostic_results FOR SELECT USING (true);
CREATE POLICY "Anyone can insert diagnostic results" ON public.candidate_diagnostic_results FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update diagnostic results" ON public.candidate_diagnostic_results FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete diagnostic results" ON public.candidate_diagnostic_results FOR DELETE USING (true);

CREATE INDEX idx_diagnostic_candidate ON public.candidate_diagnostic_results(candidate_id, taken_at DESC);
