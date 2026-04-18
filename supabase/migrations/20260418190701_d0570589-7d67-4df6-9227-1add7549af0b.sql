-- Add trainer ownership to admin_modules
ALTER TABLE public.admin_modules ADD COLUMN IF NOT EXISTS trainer_id uuid NULL;
CREATE INDEX IF NOT EXISTS idx_admin_modules_trainer_id ON public.admin_modules(trainer_id);