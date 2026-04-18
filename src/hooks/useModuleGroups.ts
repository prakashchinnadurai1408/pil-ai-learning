import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ModuleGroup {
  id: string;
  name: string;
  description: string;
  owner_role: "admin" | "trainer";
  owner_id: string;
  owner_name: string;
  status: string;
  items: { id: string; module_id: number; module_title: string; sort_order: number }[];
  assignments: {
    id: string;
    scope_type: "cohort" | "student";
    college: string;
    department: string;
    degree: string;
    student_id: string | null;
  }[];
}

/** Lists groups owned by a specific role/user (admin sees all admin groups; trainer sees their own). */
export function useModuleGroups(opts: { ownerRole?: "admin" | "trainer"; ownerId?: string } = {}) {
  const [groups, setGroups] = useState<ModuleGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("module_groups" as any).select("*").order("created_at", { ascending: false });
    if (opts.ownerRole) q = q.eq("owner_role", opts.ownerRole);
    if (opts.ownerId) q = q.eq("owner_id", opts.ownerId);
    const { data: gData } = await q;
    const groupIds = (gData || []).map((g: any) => g.id);
    if (groupIds.length === 0) { setGroups([]); setLoading(false); return; }
    const [{ data: items }, { data: assigns }] = await Promise.all([
      supabase.from("module_group_items" as any).select("*").in("group_id", groupIds).order("sort_order"),
      supabase.from("module_group_assignments" as any).select("*").in("group_id", groupIds),
    ]);
    setGroups((gData || []).map((g: any) => ({
      ...g,
      items: (items || []).filter((i: any) => i.group_id === g.id),
      assignments: (assigns || []).filter((a: any) => a.group_id === g.id),
    })));
    setLoading(false);
  }, [opts.ownerRole, opts.ownerId]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);
  return { groups, loading, refetch: fetchGroups };
}

/** For a logged-in student, returns the groups assigned to them (via cohort or direct student_id). */
export function useStudentModuleGroups(
  studentId: string | null,
  college: string,
  department: string,
  degree: string,
) {
  const [groups, setGroups] = useState<ModuleGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) { setGroups([]); setLoading(false); return; }
    (async () => {
      setLoading(true);
      // Find assignments matching this student
      const { data: assigns } = await supabase.from("module_group_assignments" as any).select("*");
      const matched = (assigns || []).filter((a: any) => {
        if (a.scope_type === "student") return a.student_id === studentId;
        // cohort match: empty fields = wildcard
        if (a.college && a.college !== college) return false;
        if (a.department && a.department !== department) return false;
        if (a.degree && a.degree !== degree) return false;
        return true;
      });
      const groupIds = [...new Set(matched.map((a: any) => a.group_id))];
      if (groupIds.length === 0) { setGroups([]); setLoading(false); return; }
      const [{ data: gData }, { data: items }] = await Promise.all([
        supabase.from("module_groups" as any).select("*").in("id", groupIds).eq("status", "published"),
        supabase.from("module_group_items" as any).select("*").in("group_id", groupIds).order("sort_order"),
      ]);
      setGroups((gData || []).map((g: any) => ({
        ...g,
        items: (items || []).filter((i: any) => i.group_id === g.id),
        assignments: matched.filter((a: any) => a.group_id === g.id),
      })));
      setLoading(false);
    })();
  }, [studentId, college, department, degree]);

  return { groups, loading };
}
