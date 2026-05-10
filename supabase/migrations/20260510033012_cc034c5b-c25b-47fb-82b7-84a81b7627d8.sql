
CREATE TABLE public.curriculum_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_id uuid NOT NULL,
  assessment_id uuid,
  student_id uuid NOT NULL,
  student_name text NOT NULL DEFAULT '',
  student_college text NOT NULL DEFAULT '',
  student_department text NOT NULL DEFAULT '',
  student_degree text NOT NULL DEFAULT '',
  attachment_url text NOT NULL DEFAULT '',
  attachment_name text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  trainer_feedback text NOT NULL DEFAULT '',
  score integer,
  max_score integer,
  status text NOT NULL DEFAULT 'submitted',
  reviewed_by text NOT NULL DEFAULT '',
  reviewed_by_name text NOT NULL DEFAULT '',
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (curriculum_id, student_id, assessment_id)
);

CREATE INDEX idx_curriculum_submissions_curriculum ON public.curriculum_submissions(curriculum_id);
CREATE INDEX idx_curriculum_submissions_student ON public.curriculum_submissions(student_id);

ALTER TABLE public.curriculum_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read curriculum_submissions" ON public.curriculum_submissions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert curriculum_submissions" ON public.curriculum_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update curriculum_submissions" ON public.curriculum_submissions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete curriculum_submissions" ON public.curriculum_submissions FOR DELETE USING (true);

CREATE TRIGGER trg_curriculum_submissions_updated
BEFORE UPDATE ON public.curriculum_submissions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
