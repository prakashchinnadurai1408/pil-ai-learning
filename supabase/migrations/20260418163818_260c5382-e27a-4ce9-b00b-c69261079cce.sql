ALTER TABLE public.admin_section_content
  ADD COLUMN IF NOT EXISTS topic_id uuid REFERENCES public.admin_module_topics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_admin_section_content_topic_id
  ON public.admin_section_content(topic_id);