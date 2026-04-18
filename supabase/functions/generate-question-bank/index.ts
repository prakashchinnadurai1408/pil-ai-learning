import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const hash = (q: string) => q.trim().toLowerCase().slice(0, 80);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { moduleId, moduleName, count = 20, difficulty = "mixed" } = await req.json();

    if (!moduleId || !moduleName) {
      return new Response(JSON.stringify({ error: "moduleId and moduleName are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Fetch existing questions for this module to bias AI away from duplicates
    const { data: existing } = await supabase
      .from("quiz_question_bank")
      .select("question")
      .eq("module_id", moduleId);
    const existingHashes = new Set((existing || []).map((r: any) => hash(r.question)));
    const sampleExisting = (existing || []).slice(0, 8).map((r: any) => `- ${r.question}`).join("\n");

    const target = Math.min(Math.max(Number(count) || 20, 5), 50);

    const prompt = `You are an expert quiz author for an AI/tech learning platform serving Indian UG/PG students.

Generate exactly ${target} ORIGINAL multiple-choice questions for the module: "${moduleName}".

Requirements:
- Difficulty mix: ${difficulty === "mixed" ? "40% easy, 40% medium, 20% hard" : difficulty}
- Cover diverse sub-topics within the module (concepts, applications, terminology, scenarios, problem-solving)
- Each question: 4 options, exactly 1 correct, brief explanation (1-2 sentences)
- Avoid trivia; focus on understanding and application
- DO NOT repeat or paraphrase any of these existing questions:
${sampleExisting || "(none yet)"}

Respond ONLY with a valid JSON array, no markdown, no code fences:
[{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"..."}]`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You generate quiz questions. Respond with valid JSON only — no markdown fences, no commentary." },
          { role: "user", content: prompt },
        ],
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI API error:", errText);
      const status = response.status === 429 ? 429 : response.status === 402 ? 402 : 502;
      return new Response(JSON.stringify({ error: status === 429 ? "Rate limited. Try again shortly." : status === 402 ? "AI credits exhausted." : "Failed to generate" }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let parsed: any[] = [];
    try {
      parsed = JSON.parse(content);
    } catch {
      // try to extract JSON array
      const m = content.match(/\[[\s\S]*\]/);
      if (m) parsed = JSON.parse(m[0]);
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return new Response(JSON.stringify({ error: "AI returned no usable questions" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate + dedupe
    const valid = parsed.filter((q: any) =>
      q && typeof q.question === "string" &&
      Array.isArray(q.options) && q.options.length === 4 &&
      typeof q.correct === "number" && q.correct >= 0 && q.correct < 4
    );

    const fresh = valid.filter((q: any) => !existingHashes.has(hash(q.question)));

    if (fresh.length === 0) {
      return new Response(JSON.stringify({ inserted: 0, generated: valid.length, message: "All generated questions were duplicates of existing bank entries." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows = fresh.map((q: any) => ({
      module_id: Number(moduleId),
      module_name: moduleName,
      question: q.question,
      options: q.options,
      correct: q.correct,
      explanation: q.explanation || "",
      source: "ai_bulk",
    }));

    const { error: insertError } = await supabase.from("quiz_question_bank").insert(rows);
    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save to question bank" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ inserted: rows.length, generated: valid.length, duplicatesSkipped: valid.length - fresh.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-question-bank error:", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
