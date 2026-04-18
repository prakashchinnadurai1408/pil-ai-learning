import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the set of student names a trainer is allowed to see.
 * - If no trainerId is in sessionStorage (admin mode), returns { names: null } meaning "no filter".
 * - Otherwise returns a Set of student names mapped to that trainer.
 */
export function useTrainerScope() {
  const trainerId = typeof window !== "undefined" ? sessionStorage.getItem("trainerId") : null;
  const [names, setNames] = useState<Set<string> | null>(null);
  const [ids, setIds] = useState<Set<string> | null>(null);
  const [ready, setReady] = useState(!trainerId);

  useEffect(() => {
    if (!trainerId) { setNames(null); setIds(null); setReady(true); return; }
    (async () => {
      const { data: assignments } = await (supabase as any)
        .from("trainer_students").select("student_id").eq("trainer_id", trainerId);
      const studentIds: string[] = (assignments || []).map((a: any) => a.student_id);
      setIds(new Set(studentIds));
      if (studentIds.length === 0) { setNames(new Set()); setReady(true); return; }
      const { data: students } = await supabase
        .from("students").select("name").in("id", studentIds);
      setNames(new Set((students || []).map((s: any) => s.name)));
      setReady(true);
    })();
  }, [trainerId]);

  return { trainerId, allowedNames: names, allowedIds: ids, ready };
}
