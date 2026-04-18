-- Module Groups
CREATE TABLE public.module_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  owner_role text NOT NULL DEFAULT 'admin',
  owner_id text NOT NULL DEFAULT '',
  owner_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.module_group_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.module_groups(id) ON DELETE CASCADE,
  module_id integer NOT NULL,
  module_title text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.module_group_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.module_groups(id) ON DELETE CASCADE,
  scope_type text NOT NULL DEFAULT 'cohort', -- 'cohort' | 'student'
  college text NOT NULL DEFAULT '',
  department text NOT NULL DEFAULT '',
  degree text NOT NULL DEFAULT '',
  student_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.module_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_group_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.module_group_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read module groups" ON public.module_groups FOR SELECT USING (true);
CREATE POLICY "Anyone can insert module groups" ON public.module_groups FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update module groups" ON public.module_groups FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete module groups" ON public.module_groups FOR DELETE USING (true);

CREATE POLICY "Anyone can read module group items" ON public.module_group_items FOR SELECT USING (true);
CREATE POLICY "Anyone can insert module group items" ON public.module_group_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update module group items" ON public.module_group_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete module group items" ON public.module_group_items FOR DELETE USING (true);

CREATE POLICY "Anyone can read module group assignments" ON public.module_group_assignments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert module group assignments" ON public.module_group_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update module group assignments" ON public.module_group_assignments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete module group assignments" ON public.module_group_assignments FOR DELETE USING (true);

-- Project Assignments
CREATE TABLE public.project_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assigner_role text NOT NULL DEFAULT 'trainer', -- 'admin' | 'trainer'
  assigner_id text NOT NULL DEFAULT '',
  assigner_name text NOT NULL DEFAULT '',
  student_id uuid NOT NULL,
  student_name text NOT NULL DEFAULT '',
  source_type text NOT NULL DEFAULT 'custom', -- 'guide' | 'custom'
  stream_id text NOT NULL DEFAULT '',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  due_date date,
  status text NOT NULL DEFAULT 'assigned', -- assigned | in_progress | submitted | reviewed
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read project assignments" ON public.project_assignments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert project assignments" ON public.project_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update project assignments" ON public.project_assignments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete project assignments" ON public.project_assignments FOR DELETE USING (true);

CREATE INDEX idx_module_group_items_group ON public.module_group_items(group_id);
CREATE INDEX idx_module_group_assignments_group ON public.module_group_assignments(group_id);
CREATE INDEX idx_module_group_assignments_student ON public.module_group_assignments(student_id);
CREATE INDEX idx_project_assignments_student ON public.project_assignments(student_id);