import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ProjectAssignment {
  id: string;
  assigner_role: "admin" | "trainer";
  assigner_id: string;
  assigner_name: string;
  student_id: string;
  student_name: string;
  source_type: "guide" | "custom";
  stream_id: string;
  title: string;
  description: string;
  due_date: string | null;
  status: "assigned" | "in_progress" | "submitted" | "reviewed";
  created_at: string;
  updated_at: string;
}

export function useProjectAssignments(filter?: {
  studentId?: string;
  assignerId?: string;
  assignerRole?: "admin" | "trainer";
}) {
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("project_assignments" as any).select("*").order("created_at", { ascending: false });
    if (filter?.studentId) q = q.eq("student_id", filter.studentId);
    if (filter?.assignerId) q = q.eq("assigner_id", filter.assignerId);
    if (filter?.assignerRole) q = q.eq("assigner_role", filter.assignerRole);
    const { data } = await q;
    setAssignments((data as any) || []);
    setLoading(false);
  }, [filter?.studentId, filter?.assignerId, filter?.assignerRole]);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { assignments, loading, refetch: fetchData };
}
