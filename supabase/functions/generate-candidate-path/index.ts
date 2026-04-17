import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Static catalog (must mirror src/data/modules.ts ids/titles)
const CORE_MODULES = [
  { id: 1, title: "Introduction to AI", level: "beginner", topics: ["AI basics", "ML vs DL"] },
  { id: 2, title: "AI Tools for Candidates", level: "beginner", topics: ["ChatGPT", "Gemini", "Copilot"] },
  { id: 3, title: "Prompt Engineering", level: "intermediate", topics: ["Prompt frameworks", "Chaining"] },
  { id: 4, title: "Multimodal AI", level: "intermediate", topics: ["Image", "Voice", "Video AI"] },
  { id: 5, title: "AI Agents", level: "intermediate", topics: ["Agents", "Workflows"] },
  { id: 6, title: "LLM Models & Providers", level: "intermediate", topics: ["LLMs", "Tokens", "Context"] },
  { id: 7, title: "AI Workflow Automation", level: "advanced", topics: ["Automation", "Pipelines"] },
  { id: 8, title: "RAG", level: "advanced", topics: ["Vector DBs", "Retrieval"] },
  { id: 9, title: "Fine-Tuning AI Assistants", level: "advanced", topics: ["Custom models", "Datasets"] },
  { id: 10, title: "AI SaaS Development", level: "advanced", topics: ["AI APIs", "Products"] },
];

const DEFAULT_BEGINNER_ORDER = [1, 2, 3, 6, 4, 5, 7, 8, 9, 10];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { candidateId } = await req.json();
    if (!candidateId) {
      return new Response(JSON.stringify({ error: "candidateId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(url, key);

    // Fetch candidate
    const { data: candidate } = await sb.from("students").select("id, name, college, department, degree, subscription_tier").eq("id", candidateId).single();
    if (!candidate) {
      return new Response(JSON.stringify({ error: "Candidate not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch learning signals in parallel
    const [progressRes, scoresRes, attemptsRes, codingRes] = await Promise.all([
      sb.from("student_module_progress").select("module_id, progress_percent, completed").eq("student_id", candidateId),
      sb.from("student_assessment_scores").select("module_id, score, total_questions, correct_answers").eq("student_id", candidateId),
      sb.from("assessment_attempts").select("score, total_questions, correct_answers, completed_at").eq("student_id", candidateId).limit(20),
      sb.from("student_solved_challenges").select("challenge_id, language").eq("student_name", candidate.name).limit(50),
    ]);

    const progress = progressRes.data || [];
    const scores = scoresRes.data || [];
    const attempts = attemptsRes.data || [];
    const coding = codingRes.data || [];

    const hasActivity = progress.length > 0 || scores.length > 0 || attempts.length > 0 || coding.length > 0;

    // ===== New candidate: default beginner path (no AI call) =====
    if (!hasActivity) {
      const path = await createPath(sb, {
        candidateId,
        candidateName: candidate.name,
        title: "Beginner's AI Learning Journey",
        rationale:
          "Welcome! You haven't completed any modules or assessments yet, so we've created a beginner-friendly journey. Start with Module 1 to build a solid foundation, then progress through prompt engineering and LLM basics before tackling advanced topics like RAG and fine-tuning.",
        modules: DEFAULT_BEGINNER_ORDER.map((id, i) => {
          const m = CORE_MODULES.find((x) => x.id === id)!;
          return {
            module_id: id,
            module_title: m.title,
            sort_order: i,
            reason:
              i === 0
                ? "Start here — foundational AI concepts everyone needs."
                : i < 3
                ? "Builds directly on the previous module."
                : "Advance your skills once basics are solid.",
          };
        }),
        isBeginnerDefault: true,
        modelUsed: "default-beginner",
      });
      return new Response(JSON.stringify({ success: true, path, beginnerDefault: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== Returning candidate: ask AI to generate adaptive path =====
    const completedModuleIds = progress.filter((p: any) => p.completed).map((p: any) => p.module_id);
    const inProgressModules = progress.filter((p: any) => !p.completed && p.progress_percent > 0);
    const avgQuizScore = scores.length ? Math.round(scores.reduce((s: number, x: any) => s + x.score, 0) / scores.length) : 0;
    const avgAssessmentScore = attempts.length ? Math.round(attempts.reduce((s: number, x: any) => s + x.score, 0) / attempts.length) : 0;
    const codingLanguages = [...new Set(coding.map((c: any) => c.language))];

    const summary = {
      completed_module_ids: completedModuleIds,
      in_progress_modules: inProgressModules.map((p: any) => ({ module_id: p.module_id, progress: p.progress_percent })),
      module_quiz_avg_score: avgQuizScore,
      module_quiz_count: scores.length,
      assessment_avg_score: avgAssessmentScore,
      assessment_count: attempts.length,
      coding_challenges_solved: coding.length,
      coding_languages_used: codingLanguages,
      tier: candidate.subscription_tier,
    };

    // Get default LLM model
    const { data: llmSettings } = await sb.from("llm_settings").select("default_model").maybeSingle();
    const model = llmSettings?.default_model || "google/gemini-2.5-flash";

    const systemPrompt = `You are an adaptive learning path advisor for an AI training platform. You analyze a candidate's learning data and recommend a personalized, ordered learning path.

Rules:
1. Recommend modules in optimal order — prerequisites first, then progression based on weak areas.
2. SKIP modules already completed with score >= 70%, but you may include them as "review" if scores are low.
3. Prioritize modules where the candidate showed weakness (low quiz/assessment scores).
4. If coding activity is low, include foundational modules. If coding is strong, accelerate to advanced topics.
5. Provide a concise per-module reason (max 20 words).
6. Provide an overall rationale explaining your strategy (max 80 words).

Respond with ONLY valid JSON in this exact shape:
{
  "title": "string (max 60 chars)",
  "rationale": "string explaining overall strategy",
  "modules": [
    { "module_id": number, "reason": "string" }
  ]
}`;

    const userPrompt = `Candidate Learning Data:
${JSON.stringify(summary, null, 2)}

Available Modules:
${JSON.stringify(CORE_MODULES, null, 2)}

Generate the adaptive learning path now.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("AI gateway error", aiResp.status, txt);
      return new Response(JSON.stringify({ error: "AI generation failed", detail: txt }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const content = aiJson.choices?.[0]?.message?.content || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Retry stripping markdown fences
      const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      parsed = JSON.parse(cleaned);
    }

    const recommendedModules = (parsed.modules || []).map((m: any, i: number) => {
      const cat = CORE_MODULES.find((x) => x.id === m.module_id);
      return {
        module_id: m.module_id,
        module_title: cat?.title || `Module ${m.module_id}`,
        sort_order: i,
        reason: m.reason || "",
      };
    });

    if (recommendedModules.length === 0) {
      return new Response(JSON.stringify({ error: "AI returned empty path" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const path = await createPath(sb, {
      candidateId,
      candidateName: candidate.name,
      title: parsed.title || "Your AI Learning Path",
      rationale: parsed.rationale || "",
      modules: recommendedModules,
      isBeginnerDefault: false,
      modelUsed: model,
    });

    return new Response(JSON.stringify({ success: true, path }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("generate-candidate-path error", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function createPath(
  sb: any,
  opts: {
    candidateId: string;
    candidateName: string;
    title: string;
    rationale: string;
    modules: { module_id: number; module_title: string; sort_order: number; reason: string }[];
    isBeginnerDefault: boolean;
    modelUsed: string;
  }
) {
  // Replace any existing path for this candidate
  await sb.from("candidate_learning_paths").delete().eq("candidate_id", opts.candidateId);

  const { data: pathRow, error } = await sb
    .from("candidate_learning_paths")
    .insert({
      candidate_id: opts.candidateId,
      candidate_name: opts.candidateName,
      title: opts.title,
      rationale: opts.rationale,
      status: "active",
      source: "ai",
      model_used: opts.modelUsed,
      is_beginner_default: opts.isBeginnerDefault,
    })
    .select("*")
    .single();

  if (error) throw error;

  await sb.from("candidate_learning_path_modules").insert(
    opts.modules.map((m) => ({ ...m, path_id: pathRow.id }))
  );

  return { ...pathRow, modules: opts.modules };
}
