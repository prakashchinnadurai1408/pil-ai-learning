// Generates a daily AI practice plan based on the student's completed modules.
// Body: { studentId, studentName?, force? }
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const { studentId, studentName = "", force = false } = await req.json();
    if (!studentId) return json({ error: "studentId is required" }, 400);

    const today = new Date().toISOString().slice(0, 10);

    if (!force) {
      const { data: existing } = await supabase.from("practice_plans")
        .select("id, summary").eq("student_id", studentId).eq("plan_date", today).maybeSingle();
      if (existing) {
        const { data: tasks } = await supabase.from("practice_plan_tasks")
          .select("*").eq("plan_id", existing.id).order("sort_order");
        return json({ planId: existing.id, summary: existing.summary, tasks: tasks || [], cached: true });
      }
    }

    // Pull progress + recent quiz scores
    const { data: progress } = await supabase.from("student_module_progress")
      .select("module_id, completed, progress_percent").eq("student_id", studentId);
    const { data: scores } = await supabase.from("student_assessment_scores")
      .select("module_id, score").eq("student_id", studentId).order("attempted_at", { ascending: false }).limit(20);

    const completed = (progress || []).filter((p: any) => p.completed || (p.progress_percent || 0) >= 80).map((p: any) => p.module_id);
    const inProgress = (progress || []).filter((p: any) => !p.completed && (p.progress_percent || 0) > 0 && (p.progress_percent || 0) < 80).map((p: any) => p.module_id);

    const avgScore = scores && scores.length
      ? Math.round(scores.reduce((a: number, b: any) => a + (b.score || 0), 0) / scores.length)
      : null;

    const systemPrompt = `You are an AI study coach. Build a focused 4-task daily practice plan based on what the student has learned.
Each task must be one of: prompt (a prompt-engineering exercise), agent (an AI agent task), reflection (write/think), challenge (small coding or analysis task).
Tasks should reinforce completed modules and gently advance in-progress ones. Keep titles ≤ 70 chars and descriptions ≤ 220 chars.`;

    const userPrompt = `Student profile:
- Completed module IDs: ${completed.length ? completed.join(", ") : "(none yet)"}
- In-progress module IDs: ${inProgress.length ? inProgress.join(", ") : "(none)"}
- Recent average quiz score: ${avgScore ?? "no attempts yet"}
- Today: ${today}

Available tools the student can use: "AI Playground" (chat), "Prompt Lab", "AI Tools" (sandbox), "Coding".
Generate 4 practice tasks for today.`;

    const tools = [{
      type: "function",
      function: {
        name: "submit_plan",
        description: "Return the day's practice plan.",
        parameters: {
          type: "object",
          properties: {
            summary: { type: "string", description: "1-2 sentence motivational framing" },
            tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  task_type: { type: "string", enum: ["prompt", "agent", "reflection", "challenge"] },
                  title: { type: "string" },
                  description: { type: "string" },
                  suggested_tool: { type: "string" },
                  estimated_minutes: { type: "number" },
                  related_module_id: { type: "number" },
                },
                required: ["task_type", "title", "description", "suggested_tool", "estimated_minutes"],
                additionalProperties: false,
              },
            },
          },
          required: ["summary", "tasks"],
          additionalProperties: false,
        },
      },
    }];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        tools,
        tool_choice: { type: "function", function: { name: "submit_plan" } },
      }),
    });
    if (!aiRes.ok) {
      if (aiRes.status === 429) return json({ error: "Rate limit reached." }, 429);
      if (aiRes.status === 402) return json({ error: "AI credits exhausted." }, 402);
      return json({ error: "AI failed" }, 502);
    }
    const aiJson = await aiRes.json();
    const args = aiJson?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return json({ error: "no plan returned" }, 502);
    const parsed = JSON.parse(args);

    // Upsert plan
    const { data: existing } = await supabase.from("practice_plans")
      .select("id").eq("student_id", studentId).eq("plan_date", today).maybeSingle();

    let planId = existing?.id;
    if (planId) {
      await supabase.from("practice_plan_tasks").delete().eq("plan_id", planId);
      await supabase.from("practice_plans").update({
        summary: parsed.summary || "",
        completed_modules: completed,
        generated_at: new Date().toISOString(),
        model_used: "google/gemini-2.5-flash",
      }).eq("id", planId);
    } else {
      const { data: created, error: cErr } = await supabase.from("practice_plans").insert({
        student_id: studentId,
        student_name: studentName,
        plan_date: today,
        summary: parsed.summary || "",
        completed_modules: completed,
        model_used: "google/gemini-2.5-flash",
      }).select("id").single();
      if (cErr) return json({ error: "could not save plan", details: cErr.message }, 500);
      planId = created.id;
    }

    const taskRows = (parsed.tasks || []).slice(0, 6).map((t: any, i: number) => ({
      plan_id: planId,
      sort_order: i,
      task_type: t.task_type || "prompt",
      title: String(t.title || "Practice").slice(0, 200),
      description: String(t.description || "").slice(0, 600),
      suggested_tool: String(t.suggested_tool || "").slice(0, 80),
      estimated_minutes: Math.max(5, Math.min(60, Number(t.estimated_minutes) || 10)),
      related_module_id: t.related_module_id ? Number(t.related_module_id) : null,
    }));

    if (taskRows.length) await supabase.from("practice_plan_tasks").insert(taskRows);

    const { data: tasks } = await supabase.from("practice_plan_tasks")
      .select("*").eq("plan_id", planId).order("sort_order");

    return json({ planId, summary: parsed.summary, tasks: tasks || [] });
  } catch (e) {
    console.error("generate-practice-plan fatal:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
