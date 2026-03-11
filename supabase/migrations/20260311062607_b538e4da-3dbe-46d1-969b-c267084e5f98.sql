
-- Create locations table with auto-increment ID
CREATE TABLE public.locations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read locations
CREATE POLICY "Anyone can read locations" ON public.locations FOR SELECT USING (true);

-- Allow anyone to insert locations (unauthenticated users during registration)
CREATE POLICY "Anyone can insert locations" ON public.locations FOR INSERT WITH CHECK (true);
