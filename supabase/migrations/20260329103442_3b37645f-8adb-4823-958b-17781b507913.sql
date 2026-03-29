
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS degree text NOT NULL DEFAULT '';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS department text NOT NULL DEFAULT '';
