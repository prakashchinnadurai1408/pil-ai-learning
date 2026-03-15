import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface UploadedDoc {
  id: string;
  student_name: string;
  stream_id: string;
  step_number: number;
  doc_code: string | null;
  file_name: string;
  file_path: string;
  file_size: number;
  uploaded_at: string;
}

export const useProjectDocuments = (studentName: string, streamId: string | null) => {
  const [documents, setDocuments] = useState<UploadedDoc[]>([]);
  const [uploading, setUploading] = useState(false);

  const fetchDocuments = useCallback(async () => {
    if (!streamId || !studentName) return;
    const { data, error } = await supabase
      .from("student_project_documents")
      .select("*")
      .eq("student_name", studentName)
      .eq("stream_id", streamId);
    if (!error && data) setDocuments(data as UploadedDoc[]);
  }, [studentName, streamId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const uploadFile = async (file: File, stepNumber: number, docCode?: string) => {
    if (!streamId || !studentName) return;
    setUploading(true);
    try {
      const safeName = studentName.replace(/[^a-zA-Z0-9]/g, "_");
      const filePath = `${safeName}/${streamId}/step-${stepNumber}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("project-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from("student_project_documents")
        .insert({
          student_name: studentName,
          stream_id: streamId,
          step_number: stepNumber,
          doc_code: docCode || null,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
        });

      if (dbError) throw dbError;

      toast({ title: "File uploaded", description: file.name });
      await fetchDocuments();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (doc: UploadedDoc) => {
    try {
      await supabase.storage.from("project-documents").remove([doc.file_path]);
      await supabase.from("student_project_documents").delete().eq("id", doc.id);
      toast({ title: "File deleted", description: doc.file_name });
      await fetchDocuments();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  const getPublicUrl = (filePath: string) => {
    const { data } = supabase.storage.from("project-documents").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const getDocsForStep = (stepNumber: number) =>
    documents.filter((d) => d.step_number === stepNumber);

  return { documents, uploading, uploadFile, deleteFile, getPublicUrl, getDocsForStep };
};
