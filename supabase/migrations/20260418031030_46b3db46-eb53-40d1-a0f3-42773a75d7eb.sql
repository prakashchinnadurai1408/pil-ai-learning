CREATE TABLE public.trainer_students (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id uuid NOT NULL,
  student_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (trainer_id, student_id)
);

CREATE INDEX idx_trainer_students_trainer ON public.trainer_students(trainer_id);
CREATE INDEX idx_trainer_students_student ON public.trainer_students(student_id);

ALTER TABLE public.trainer_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read trainer_students"
  ON public.trainer_students FOR SELECT USING (true);

CREATE POLICY "Anyone can insert trainer_students"
  ON public.trainer_students FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can delete trainer_students"
  ON public.trainer_students FOR DELETE USING (true);