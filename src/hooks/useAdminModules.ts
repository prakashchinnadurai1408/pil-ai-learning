import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AdminModule {
  id: number;
  title: string;
  description: string;
  icon_name: string;
  color: string;
  duration: string;
  status: string;
  created_at: string;
  created_by: string;
  trainer_id: string | null;
  display_number: number;
  topics: AdminModuleTopic[];
}

export interface AdminModuleTopic {
  id: string;
  module_id: number;
  title: string;
  description: string;
  suggested_videos: string[];
  sort_order: number;
}

/**
 * Determine viewer scope from sessionStorage:
 * - admin → sees all modules
 * - trainer → sees admin modules + own trainer-created modules
 * - student → sees admin modules + modules created by trainers they're assigned to
 */
async function getVisibleTrainerIds(): Promise<{ mode: "all" | "filter"; allowedTrainerIds: string[] }> {
  if (typeof window === "undefined") return { mode: "all", allowedTrainerIds: [] };

  const adminEmail = sessionStorage.getItem("adminEmail");
  if (adminEmail) return { mode: "all", allowedTrainerIds: [] };

  const trainerId = sessionStorage.getItem("trainerId");
  if (trainerId) return { mode: "filter", allowedTrainerIds: [trainerId] };

  const studentId = sessionStorage.getItem("studentId");
  if (studentId) {
    const { data } = await supabase
      .from("trainer_students")
      .select("trainer_id")
      .eq("student_id", studentId);
    const ids = (data || []).map((r: any) => r.trainer_id).filter(Boolean);
    return { mode: "filter", allowedTrainerIds: ids };
  }

  // Anonymous / unknown viewer → only admin modules (no trainer-scoped ones)
  return { mode: "filter", allowedTrainerIds: [] };
}

export function useAdminModules() {
  const [adminModules, setAdminModules] = useState<AdminModule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchModules = async () => {
    setLoading(true);
    const scope = await getVisibleTrainerIds();

    const { data: mods } = await supabase
      .from("admin_modules")
      .select("*")
      .order("created_at", { ascending: true });

    const { data: topics } = await supabase
      .from("admin_module_topics")
      .select("*")
      .order("sort_order", { ascending: true });

    const filteredMods = (mods || []).filter((m: any) => {
      if (scope.mode === "all") return true;
      // Admin-created (no trainer_id) → always visible
      if (!m.trainer_id) return true;
      // Trainer-created → only if viewer is allowed
      return scope.allowedTrainerIds.includes(m.trainer_id);
    });

    const mapped: AdminModule[] = filteredMods.map((m: any, idx: number) => ({
      ...m,
      created_by: m.created_by || "admin",
      trainer_id: m.trainer_id ?? null,
      display_number: idx + 1,
      topics: (topics || []).filter((t: any) => t.module_id === m.id),
    }));

    setAdminModules(mapped);
    setLoading(false);
  };

  useEffect(() => {
    fetchModules();
  }, []);

  return { adminModules, loading, refetch: fetchModules };
}
