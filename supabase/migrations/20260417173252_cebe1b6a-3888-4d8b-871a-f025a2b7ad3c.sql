ALTER TABLE public.path_regeneration_settings
  ADD COLUMN IF NOT EXISTS day_of_week integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS day_of_month integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS hour_utc integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS minute_utc integer NOT NULL DEFAULT 0;