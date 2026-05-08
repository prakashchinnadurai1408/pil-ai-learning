
-- Trainer (and admin) curriculum: Subjects → Topics → Subtopics → Content/Videos/Quiz/Assessment
-- Reuses ownership model from module_groups (owner_role/owner_id) and assignment model from module_group_assignments.

CREATE TABLE IF NOT EXISTS public.trainer_curricula (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_role text NOT NULL DEFAULT 'trainer',  -- 'trainer' | 'admin'
  owner_id text NOT NULL DEFAULT '',
  owner_name text NOT NULL DEFAULT '',
  owner_college text NOT NULL DEFAULT '',  -- trainer's institute (auto-scope default)
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  goal text NOT NULL DEFAULT '',           -- the JD/goal used for AI generation
  status text NOT NULL DEFAULT 'draft',    -- draft | published
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.curriculum_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_id uuid NOT NULL REFERENCES public.trainer_curricula(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.curriculum_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.curriculum_subjects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.curriculum_subtopics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.curriculum_topics(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',  -- markdown body (AI generated)
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.curriculum_videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.curriculum_topics(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  youtube_query text NOT NULL DEFAULT '',
  youtube_id text NOT NULL DEFAULT '',
  duration text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.curriculum_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.curriculum_topics(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Topic Quiz',
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{question, options[], correct, explanation}]
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.curriculum_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_id uuid NOT NULL REFERENCES public.trainer_curricula(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Final Assessment',
  description text NOT NULL DEFAULT '',
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  passing_score integer NOT NULL DEFAULT 60,
  time_limit_minutes integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.curriculum_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_id uuid NOT NULL REFERENCES public.trainer_curricula(id) ON DELETE CASCADE,
  scope_type text NOT NULL DEFAULT 'cohort',  -- cohort | student
  college text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT '',
  degree text NOT NULL DEFAULT '',
  student_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_curr_subjects_curr ON public.curriculum_subjects(curriculum_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_curr_topics_subj ON public.curriculum_topics(subject_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_curr_sub_topic ON public.curriculum_subtopics(topic_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_curr_videos_topic ON public.curriculum_videos(topic_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_curr_quiz_topic ON public.curriculum_quizzes(topic_id);
CREATE INDEX IF NOT EXISTS idx_curr_assess_curr ON public.curriculum_assessments(curriculum_id);
CREATE INDEX IF NOT EXISTS idx_curr_assign_curr ON public.curriculum_assignments(curriculum_id);
CREATE INDEX IF NOT EXISTS idx_curr_assign_student ON public.curriculum_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_curr_owner ON public.trainer_curricula(owner_role, owner_id);

-- RLS: follow the existing project convention (permissive policies; auth handled in code via sessionStorage).
ALTER TABLE public.trainer_curricula ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_subtopics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_assignments ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'trainer_curricula','curriculum_subjects','curriculum_topics','curriculum_subtopics',
    'curriculum_videos','curriculum_quizzes','curriculum_assessments','curriculum_assignments'
  ]) LOOP
    EXECUTE format('CREATE POLICY "Anyone can read %1$s" ON public.%1$s FOR SELECT USING (true);', t);
    EXECUTE format('CREATE POLICY "Anyone can insert %1$s" ON public.%1$s FOR INSERT WITH CHECK (true);', t);
    EXECUTE format('CREATE POLICY "Anyone can update %1$s" ON public.%1$s FOR UPDATE USING (true) WITH CHECK (true);', t);
    EXECUTE format('CREATE POLICY "Anyone can delete %1$s" ON public.%1$s FOR DELETE USING (true);', t);
  END LOOP;
END $$;

CREATE TRIGGER trg_trainer_curricula_updated
  BEFORE UPDATE ON public.trainer_curricula
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
