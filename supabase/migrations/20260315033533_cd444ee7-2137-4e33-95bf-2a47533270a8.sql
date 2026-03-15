
-- Create storage bucket for project documents
INSERT INTO storage.buckets (id, name, public) VALUES ('project-documents', 'project-documents', true);

-- Allow public access to project documents
CREATE POLICY "Anyone can upload project documents" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'project-documents');
CREATE POLICY "Anyone can read project documents" ON storage.objects FOR SELECT TO public USING (bucket_id = 'project-documents');
CREATE POLICY "Anyone can delete own project documents" ON storage.objects FOR DELETE TO public USING (bucket_id = 'project-documents');

-- Create table to track uploaded documents
CREATE TABLE public.student_project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name TEXT NOT NULL,
  stream_id TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  doc_code TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.student_project_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert project documents" ON public.student_project_documents FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can read project documents" ON public.student_project_documents FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can delete project documents" ON public.student_project_documents FOR DELETE TO public USING (true);
