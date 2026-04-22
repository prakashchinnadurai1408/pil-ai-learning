// Looks at a student's recent module progress + assessment scores and
// returns 3 recommended next topics with rationale.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), {
  status: s, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { studentId } = await req.json();
    if (!studentId) return json({ error: "studentId is required" }, 400);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const [progress, scores, modules] = await Promise.all([
      supabase.from("student_module_progress").select("module_id, completed, progress_percent").eq("student_id", studentId),
      supabase.from("student_assessment_scores").select("module_id, score, total_questions, attempted_at").eq("student_id", studentId).order("attempted_at", { ascending: false }).limit(20),
      supabase.from("admin_modules").select("id,title,description").eq("status", "published"),
    ]);

    const moduleMap = new Map<number, { title: string; description: string }>();
    for (const m of (modules.data || [])) moduleMap.set(m.id, { title: m.title, description: m.description });

    const completedIds = new Set((progress.data || []).filter((p: any) => p.completed).map((p: any) => p.module_id));
    const recentScores = (scores.data || []).map((s: any) => ({
      module: moduleMap.get(s.module_id)?.title ?? `Module ${s.module_id}`,
      score: s.score,
      total: s.total_questions,
    }));

    if (!LOVABLE_API_KEY || !modules.data?.length) {
      // Heuristic fallback: pick first 3 not-yet-completed published modules.
      const recs = (modules.data || []).filter((m: any) => !completedIds.has(m.id)).slice(0, 3).map((m: any) => ({
        module_id: m.id, title: m.title, reason: "Continue with the next module in your published curriculum.",
      }));
      return json({ recommendations: recs, source: "heuristic" });
    }

    const sysPrompt = `You are a study advisor. Pick the 3 best next learning topics for this student given what they have completed and how they scored on recent quizzes. Prefer topics they have NOT completed. If recent scores are weak, suggest a review of the related topic first.`;
    const userPrompt = `Available modules (id — title):\n${(modules.data || []).map((m: any) => `${m.id} — ${m.title}: ${m.description}`).join("\n")}\n\nCompleted module IDs: ${[...completedIds].join(", ") || "(none)"}\n\nRecent quiz scores:\n${recentScores.map((s) => `- ${s.module}: ${s.score}/${s.total}`).join("\n") || "(none yet)"}`;

    const tools = [{
      type: "function",
      function: {
        name: "recommend_topics",
        description: "Return 3 ordered topic recommendations.",
        parameters: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  module_id: { type: "number" },
                  title: { type: "string" },
                  reason: { type: "string" },
                },
                required: ["module_id", "title", "reason"],
                additionalProperties: false,
              },
            },
          },
          required: ["recommendations"],
          additionalProperties: false,
        },
      },
    }];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: sysPrompt }, { role: "user", content: userPrompt }],
        tools,
        tool_choice: { type: "function", function: { name: "recommend_topics" } },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("recommend AI error:", aiRes.status, t);
      return json({ recommendations: [], error: aiRes.status === 429 ? "Rate limit reached." : aiRes.status === 402 ? "AI credits exhausted." : "AI failed" }, aiRes.status);
    }
    const aij = await aiRes.json();
    const args = aij?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let parsed: any = { recommendations: [] };
    try { parsed = JSON.parse(args || "{}"); } catch { /* noop */ }
    return json({ recommendations: (parsed.recommendations || []).slice(0, 3), source: "ai" });
  } catch (err) {
    console.error("recommend-next-topics fatal:", err);
    return json({ error: err instanceof Error ? err.message : "Unknown" }, 500);
  }
});
