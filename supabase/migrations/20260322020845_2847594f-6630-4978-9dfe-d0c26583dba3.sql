
-- Add password column to students table
ALTER TABLE public.students ADD COLUMN password text NOT NULL DEFAULT '';

-- Create trainers table
CREATE TABLE public.trainers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  mobile text NOT NULL,
  college text NOT NULL,
  location text NOT NULL,
  password text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT trainers_mobile_unique UNIQUE (mobile)
);

-- Enable RLS on trainers
ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;

-- RLS policies for trainers
CREATE POLICY "Anyone can insert trainers" ON public.trainers FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can read trainers" ON public.trainers FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can update trainers" ON public.trainers FOR UPDATE TO public USING (true) WITH CHECK (true);
