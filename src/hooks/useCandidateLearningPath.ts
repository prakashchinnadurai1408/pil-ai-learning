import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CandidatePathModule {
  id: string;
  path_id: string;
  module_id: number;
  module_title: string;
  sort_order: number;
  reason: string;
}

export interface CandidatePath {
  id: string;
  candidate_id: string;
  candidate_name: string;
  title: string;
  rationale: string;
  status: string;
  source: string;
  model_used: string;
  is_beginner_default: boolean;
  generated_at: string;
  updated_at: string;
  modules: CandidatePathModule[];
}

export function useCandidateLearningPath(candidateId: string | null) {
  const [path, setPath] = useState<CandidatePath | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchPath = useCallback(async () => {
    if (!candidateId) {
      setPath(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: pathRow } = await (supabase.from("candidate_learning_paths") as any)
      .select("*")
      .eq("candidate_id", candidateId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!pathRow) {
      setPath(null);
      setLoading(false);
      return;
    }

    const { data: mods } = await (supabase.from("candidate_learning_path_modules") as any)
      .select("*")
      .eq("path_id", pathRow.id)
      .order("sort_order", { ascending: true });

    setPath({ ...(pathRow as CandidatePath), modules: (mods as CandidatePathModule[]) || [] });
    setLoading(false);
  }, [candidateId]);

  useEffect(() => {
    fetchPath();
  }, [fetchPath]);

  const generate = useCallback(async (diagnostic?: any) => {
    if (!candidateId) return null;
    setGenerating(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-candidate-path`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ candidateId, diagnostic }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || "Generation failed");
      await fetchPath();
      return json;
    } finally {
      setGenerating(false);
    }
  }, [candidateId, fetchPath]);

  return { path, loading, generating, generate, refetch: fetchPath };
}

export function useAllCandidatePaths() {
  const [paths, setPaths] = useState<CandidatePath[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const { data: rows } = await (supabase.from("candidate_learning_paths") as any)
      .select("*")
      .order("generated_at", { ascending: false });

    const ids = (rows || []).map((r: any) => r.id);
    const { data: mods } = ids.length
      ? await (supabase.from("candidate_learning_path_modules") as any).select("*").in("path_id", ids)
      : { data: [] };

    const grouped: CandidatePath[] = (rows || []).map((r: any) => ({
      ...r,
      modules: ((mods as any[]) || []).filter((m) => m.path_id === r.id).sort((a, b) => a.sort_order - b.sort_order),
    }));
    setPaths(grouped);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { paths, loading, refetch };
}
