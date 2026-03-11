
CREATE TABLE public.colleges (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read colleges" ON public.colleges FOR SELECT USING (true);
CREATE POLICY "Anyone can insert colleges" ON public.colleges FOR INSERT WITH CHECK (true);
