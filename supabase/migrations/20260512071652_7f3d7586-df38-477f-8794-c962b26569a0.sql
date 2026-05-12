CREATE TABLE public.trainer_diff_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id text NOT NULL,
  history_id uuid NOT NULL,
  student_id uuid,
  curriculum_id uuid,
  submission_id uuid,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trainer_id, history_id)
);

CREATE INDEX idx_trainer_diff_pins_trainer ON public.trainer_diff_pins(trainer_id);
CREATE INDEX idx_trainer_diff_pins_history ON public.trainer_diff_pins(history_id);

ALTER TABLE public.trainer_diff_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read trainer diff pins" ON public.trainer_diff_pins FOR SELECT USING (true);
CREATE POLICY "Anyone can insert trainer diff pins" ON public.trainer_diff_pins FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update trainer diff pins" ON public.trainer_diff_pins FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete trainer diff pins" ON public.trainer_diff_pins FOR DELETE USING (true);