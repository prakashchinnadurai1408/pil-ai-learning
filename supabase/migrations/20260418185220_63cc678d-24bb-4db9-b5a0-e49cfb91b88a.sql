-- 1. Add audience + 4 tier columns to menu_access_controls
ALTER TABLE public.menu_access_controls
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS beginner_access boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS advanced_access boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS enterprise_access boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS label text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Drop old single-key uniqueness if any, replace with (audience, menu_key)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'menu_access_controls_menu_key_key') THEN
    ALTER TABLE public.menu_access_controls DROP CONSTRAINT menu_access_controls_menu_key_key;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS menu_access_controls_audience_menu_key_idx
  ON public.menu_access_controls(audience, menu_key);

-- 2. Backfill audience for existing rows + seed full menu list
UPDATE public.menu_access_controls SET audience = 'student' WHERE audience IS NULL OR audience = '';

-- Seed STUDENT menus (12 total)
INSERT INTO public.menu_access_controls (menu_key, audience, label, sort_order, free_access, beginner_access, advanced_access, enterprise_access, premium_access)
VALUES
  ('modules',       'student', 'Modules',           10, true,  true, true, true, true),
  ('videos',        'student', 'Videos',            20, true,  true, true, true, true),
  ('playground',    'student', 'AI Chat',           30, true,  true, true, true, true),
  ('coding',        'student', 'Coding',            40, false, true, true, true, true),
  ('prompts',       'student', 'Prompts',           50, false, true, true, true, true),
  ('tools',         'student', 'AI Tools Sandbox',  60, false, false, true, true, true),
  ('assessments',   'student', 'Assessments',       70, true,  true, true, true, true),
  ('projects',      'student', 'Projects',          80, false, false, true, true, true),
  ('ai_path',       'student', 'AI Learning Path',  90, false, true, true, true, true),
  ('module_groups', 'student', 'Module Groups',    100, true,  true, true, true, true),
  ('notifications', 'student', 'Notifications',    110, true,  true, true, true, true),
  ('profile',       'student', 'Profile',          120, true,  true, true, true, true)
ON CONFLICT (audience, menu_key) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order;

-- Seed TRAINER menus (8 total). Trainer tiers reuse the same columns: free=Free trainer, advanced=Pro trainer.
INSERT INTO public.menu_access_controls (menu_key, audience, label, sort_order, free_access, beginner_access, advanced_access, enterprise_access, premium_access)
VALUES
  ('students',              'trainer', 'Student Progress',     10, true,  true, true, true, true),
  ('assessments_overview',  'trainer', 'Assessment Overview',  20, true,  true, true, true, true),
  ('create_assessment',     'trainer', 'Create Assessment',    30, false, true, true, true, true),
  ('assessment_analytics',  'trainer', 'Assessment Analytics', 40, true,  true, true, true, true),
  ('module_analytics',      'trainer', 'Module Analytics',     50, true,  true, true, true, true),
  ('coding_analytics',      'trainer', 'Coding Analytics',     60, false, true, true, true, true),
  ('project_reviews',       'trainer', 'Project Reviews',      70, false, true, true, true, true),
  ('bulk_messaging',        'trainer', 'Bulk Messaging',       80, false, true, true, true, true)
ON CONFLICT (audience, menu_key) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order;

-- 3. Add subscription_tier to trainers (free | beginner | advanced | enterprise)
ALTER TABLE public.trainers
  ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'free';

-- 4. Update students.subscription_tier default + accept new tiers
ALTER TABLE public.students
  ALTER COLUMN subscription_tier SET DEFAULT 'free';