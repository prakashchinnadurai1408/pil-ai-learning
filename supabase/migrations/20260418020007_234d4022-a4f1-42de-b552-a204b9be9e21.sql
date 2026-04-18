ALTER TABLE public.admin_modules
  ADD COLUMN IF NOT EXISTS created_by text NOT NULL DEFAULT 'admin';