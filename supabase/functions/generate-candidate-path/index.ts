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
    const { candidateId, diagnostic, source } = await req.json();
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
    const { data: candidate } = await sb.from("students").select("id, name, college, department, degree, subscription_tier, age_group").eq("id", candidateId).single();
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

    // Fetch latest diagnostic if any (in case caller didn't pass one but it exists)
    let diagnosticData: any = diagnostic || null;
    if (!diagnosticData) {
      const { data: diagRow } = await sb
        .from("candidate_diagnostic_results")
        .select("score, total_questions, correct_answers, topic_breakdown")
        .eq("candidate_id", candidateId)
        .order("taken_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      diagnosticData = diagRow || null;
    }

    // ===== New candidate WITHOUT diagnostic: default beginner path =====
    if (!hasActivity && !diagnosticData) {
      const ageGroup = (candidate as any).age_group || "";
      const ageProfile = getAgeProfile(ageGroup);
      const tone = ageProfile.tone;
      const path = await createPath(sb, {
        candidateId,
        candidateName: candidate.name,
        title: ageProfile.beginnerTitle,
        rationale:
          `${tone.welcome} You haven't completed any modules or assessments yet, so we've created a beginner-friendly journey ${tone.tailoredFor}. Start with Module 1 to build a solid foundation, then progress through prompt engineering and LLM basics before tackling advanced topics like RAG and fine-tuning. The AI Agent will increase difficulty automatically as your scores improve.`,
        modules: DEFAULT_BEGINNER_ORDER.map((id, i) => {
          const m = CORE_MODULES.find((x) => x.id === id)!;
          return {
            module_id: id,
            module_title: m.title,
            sort_order: i,
            reason:
              i === 0
                ? tone.firstStepReason
                : i < 3
                ? "Builds directly on the previous module."
                : "Advance your skills once basics are solid.",
          };
        }),
        isBeginnerDefault: true,
        modelUsed: `default-beginner:${ageProfile.key}`,
      });
      return new Response(JSON.stringify({ success: true, path, beginnerDefault: true, ageGroup }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== Returning candidate: ask AI to generate adaptive path =====
    const completedModuleIds = progress.filter((p: any) => p.completed).map((p: any) => p.module_id);
    const inProgressModules = progress.filter((p: any) => !p.completed && p.progress_percent > 0);
    const avgQuizScore = scores.length ? Math.round(scores.reduce((s: number, x: any) => s + x.score, 0) / scores.length) : 0;
    const avgAssessmentScore = attempts.length ? Math.round(attempts.reduce((s: number, x: any) => s + x.score, 0) / attempts.length) : 0;
    const codingLanguages = [...new Set(coding.map((c: any) => c.language))];

    const ageGroup = (candidate as any).age_group || "";
    const ageProfile = getAgeProfile(ageGroup);

    const summary = {
      age_group: ageGroup || "unspecified",
      age_profile: ageProfile,
      completed_module_ids: completedModuleIds,
      in_progress_modules: inProgressModules.map((p: any) => ({ module_id: p.module_id, progress: p.progress_percent })),
      module_quiz_avg_score: avgQuizScore,
      module_quiz_count: scores.length,
      assessment_avg_score: avgAssessmentScore,
      assessment_count: attempts.length,
      coding_challenges_solved: coding.length,
      coding_languages_used: codingLanguages,
      tier: candidate.subscription_tier,
      diagnostic: diagnosticData
        ? {
            score_percent: diagnosticData.score,
            correct: diagnosticData.correct_answers,
            total: diagnosticData.total_questions,
            topic_breakdown: diagnosticData.topic_breakdown || {},
          }
        : null,
    };

    // Get default LLM model
    const { data: llmSettings } = await sb.from("llm_settings").select("default_model").maybeSingle();
    const model = llmSettings?.default_model || "google/gemini-2.5-flash";

    const systemPrompt = `You are an adaptive learning path advisor for an AI training platform serving Indian students aged 10 to 23+. You analyze a candidate's learning data AND age group to recommend a personalized, age-appropriate, ordered learning path.

Rules:
1. ALWAYS adapt vocabulary, examples, and pacing to the candidate's age_profile (provided). Younger learners need simpler language and shorter steps; older learners can handle dense content.
2. Start with EASIER foundational modules and ramp up. Only accelerate to advanced modules when quiz/assessment scores demonstrate readiness (>= 70%).
3. Recommend modules in optimal order — prerequisites first, then progression based on weak areas.
4. SKIP modules already completed with score >= 70%, but include as "review" if scores are low.
5. Prioritize modules where the candidate showed weakness (low quiz/assessment scores).
6. If coding activity is low, include foundational modules. If coding is strong, accelerate to advanced topics.
7. If a diagnostic quiz result is provided, use the topic_breakdown to identify weak topics and prioritize related modules first.
8. Provide a concise per-module reason (max 20 words) using language appropriate to the age group.
9. Provide an overall rationale (max 90 words) explaining your strategy. EXPLICITLY mention how you tailored it to the candidate's age group and current skill level.

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

// ============= Age-aware adaptive helpers =============
function getAgeProfile(ageGroup: string) {
  const g = (ageGroup || "").trim();
  if (g === "10-14") {
    return {
      key: "10-14",
      label: "10–14 years",
      reading_level: "grade 5-7 (very simple words, short sentences)",
      examples: "everyday school, games, mobile apps, cartoons",
      tone: {
        welcome: "Hey there!",
        tailoredFor: "designed for younger learners with simple words and fun examples",
        firstStepReason: "Start here — easy AI ideas explained the simple way.",
      },
      beginnerTitle: "My First AI Adventure",
      difficulty_ceiling: "easy",
      pacing: "small bite-sized steps; lots of encouragement",
    };
  }
  if (g === "15-18") {
    return {
      key: "15-18",
      label: "15–18 years",
      reading_level: "grade 8-10 (clear, conversational)",
      examples: "school projects, social media, smartphones, video editing",
      tone: {
        welcome: "Welcome!",
        tailoredFor: "shaped for high-school learners with relatable examples",
        firstStepReason: "Start here — foundational AI concepts in plain language.",
      },
      beginnerTitle: "Your AI Foundations Journey",
      difficulty_ceiling: "easy-to-medium initially",
      pacing: "moderate steps; balance theory and hands-on",
    };
  }
  if (g === "19-22") {
    return {
      key: "19-22",
      label: "19–22 years",
      reading_level: "college-level (technical vocabulary OK)",
      examples: "college projects, internships, startups, real APIs",
      tone: {
        welcome: "Welcome!",
        tailoredFor: "built for college students aiming at internships and projects",
        firstStepReason: "Start here — foundational AI concepts every student needs.",
      },
      beginnerTitle: "Your College AI Learning Path",
      difficulty_ceiling: "medium initially, scale to hard with strong scores",
      pacing: "standard pace; project-oriented",
    };
  }
  if (g === "23+") {
    return {
      key: "23+",
      label: "23+ years",
      reading_level: "professional / postgraduate",
      examples: "workplace use cases, automation, business outcomes, ROI",
      tone: {
        welcome: "Welcome!",
        tailoredFor: "tailored for working professionals and postgraduate learners",
        firstStepReason: "Start here — quick foundational refresher before advanced topics.",
      },
      beginnerTitle: "Your Professional AI Roadmap",
      difficulty_ceiling: "medium-to-hard; accelerate when scores are strong",
      pacing: "efficient pace; emphasis on applied outcomes",
    };
  }
  return {
    key: "unspecified",
    label: "unspecified",
    reading_level: "general adult learner",
    examples: "broad real-world examples",
    tone: {
      welcome: "Welcome!",
      tailoredFor: "designed for general learners",
      firstStepReason: "Start here — foundational AI concepts everyone needs.",
    },
    beginnerTitle: "Beginner's AI Learning Journey",
    difficulty_ceiling: "adaptive based on performance",
    pacing: "standard pace",
  };
}
