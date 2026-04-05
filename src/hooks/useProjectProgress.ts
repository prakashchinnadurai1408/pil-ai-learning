import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProgressState {
  completedSteps: Record<number, boolean>;
  completedDocs: Record<string, boolean>;
  githubUrl: string;
}

export const useProjectProgress = (studentName: string, streamId: string | null) => {
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [completedDocs, setCompletedDocs] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load progress on mount / stream change
  useEffect(() => {
    if (!streamId || !studentName) { setLoaded(true); return; }

    const load = async () => {
      const { data } = await supabase
        .from("student_project_progress")
        .select("completed_steps, completed_docs")
        .eq("student_name", studentName)
        .eq("stream_id", streamId)
        .maybeSingle();

      if (data) {
        setCompletedSteps((data.completed_steps as Record<string, boolean>) 
          ? Object.fromEntries(Object.entries(data.completed_steps as Record<string, boolean>).map(([k, v]) => [Number(k), v]))
          : {});
        setCompletedDocs((data.completed_docs as Record<string, boolean>) || {});
      } else {
        setCompletedSteps({});
        setCompletedDocs({});
      }
      setLoaded(true);
    };
    load();
  }, [studentName, streamId]);

  // Debounced save
  const save = useCallback((steps: Record<number, boolean>, docs: Record<string, boolean>) => {
    if (!streamId || !studentName) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(async () => {
      await supabase
        .from("student_project_progress")
        .upsert(
          {
            student_name: studentName,
            stream_id: streamId,
            completed_steps: steps as any,
            completed_docs: docs as any,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "student_name,stream_id" }
        );
    }, 500);
  }, [studentName, streamId]);

  const toggleStep = useCallback((stepNum: number) => {
    setCompletedSteps(prev => {
      const next = { ...prev, [stepNum]: !prev[stepNum] };
      save(next, completedDocs);
      return next;
    });
  }, [save, completedDocs]);

  const toggleDoc = useCallback((key: string) => {
    setCompletedDocs(prev => {
      const next = { ...prev, [key]: !prev[key] };
      save(completedSteps, next);
      return next;
    });
  }, [save, completedSteps]);

  const reset = useCallback(() => {
    setCompletedSteps({});
    setCompletedDocs({});
  }, []);

  return { completedSteps, completedDocs, toggleStep, toggleDoc, reset, loaded };
};
