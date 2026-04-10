import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  required_tier: string;
  status: string;
  created_at: string;
  updated_at: string;
  modules: LearningPathModule[];
  assignments: LearningPathAssignment[];
}

export interface LearningPathModule {
  id: string;
  path_id: string;
  module_id: number;
  sort_order: number;
}

export interface LearningPathAssignment {
  id: string;
  path_id: string;
  college: string;
  department: string;
  degree: string;
}

export function useLearningPaths() {
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPaths = async () => {
    setLoading(true);
    const [{ data: pathsData }, { data: modulesData }, { data: assignmentsData }] = await Promise.all([
      supabase.from("learning_paths").select("*").order("created_at", { ascending: true }),
      supabase.from("learning_path_modules").select("*").order("sort_order", { ascending: true }),
      supabase.from("learning_path_assignments").select("*"),
    ]);

    const mapped: LearningPath[] = (pathsData || []).map((p: any) => ({
      ...p,
      modules: (modulesData || []).filter((m: any) => m.path_id === p.id),
      assignments: (assignmentsData || []).filter((a: any) => a.path_id === p.id),
    }));

    setPaths(mapped);
    setLoading(false);
  };

  useEffect(() => {
    fetchPaths();
  }, []);

  return { paths, loading, refetch: fetchPaths };
}

export function useStudentLearningPaths(college: string, department: string, degree: string, tier: string) {
  const [allowedModuleIds, setAllowedModuleIds] = useState<number[] | null>(null);
  const [pathNames, setPathNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);

      // Get all published paths
      const { data: allPaths } = await supabase
        .from("learning_paths")
        .select("*")
        .eq("status", "published");

      if (!allPaths || allPaths.length === 0) {
        // No paths configured = show all modules (no filtering)
        setAllowedModuleIds(null);
        setPathNames([]);
        setLoading(false);
        return;
      }

      // Get assignments
      const { data: assignments } = await supabase
        .from("learning_path_assignments")
        .select("*");

      // Filter paths matching student's college/dept/degree + tier
      const matchedPathIds = allPaths
        .filter((p: any) => {
          // Tier check
          if (p.required_tier === "premium" && tier !== "premium") return false;

          // Check assignment match
          const pathAssignments = (assignments || []).filter((a: any) => a.path_id === p.id);
          if (pathAssignments.length === 0) return true; // No assignments = available to all

          return pathAssignments.some((a: any) => {
            const collegeMatch = !a.college || a.college === "" || a.college.toLowerCase() === college.toLowerCase();
            const deptMatch = !a.department || a.department === "" || a.department.toLowerCase() === department.toLowerCase();
            const degreeMatch = !a.degree || a.degree === "" || a.degree.toLowerCase() === degree.toLowerCase();
            return collegeMatch && deptMatch && degreeMatch;
          });
        })
        .map((p: any) => p.id);

      setPathNames(
        allPaths.filter((p: any) => matchedPathIds.includes(p.id)).map((p: any) => p.title)
      );

      // Get module IDs for matched paths
      const { data: pathModules } = await supabase
        .from("learning_path_modules")
        .select("module_id")
        .in("path_id", matchedPathIds.length > 0 ? matchedPathIds : ["__none__"]);

      if (matchedPathIds.length === 0) {
        setAllowedModuleIds([]);
      } else {
        const ids = (pathModules || []).map((m: any) => m.module_id);
        setAllowedModuleIds(ids.length > 0 ? ids : null);
      }

      setLoading(false);
    };

    if (college) fetch();
    else {
      setAllowedModuleIds(null);
      setLoading(false);
    }
  }, [college, department, degree, tier]);

  return { allowedModuleIds, pathNames, loading };
}
