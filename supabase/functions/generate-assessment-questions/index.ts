// Generate a typed mix of assessment questions (MCQ / Descriptive / Video / Coding)
// from a topic/skills string OR a job description, using the Lovable AI Gateway.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Mix {
  mcq: number;
  descriptive: number;
  video: number;
  coding: number;
}

interface Body {
  source_mode: "topic" | "jd";
  topic_or_skills?: string;
  jd_text?: string;
  mix: Mix;
  module_id?: number | null;
  difficulty?: "easy" | "medium" | "hard";
  language?: string; // for coding questions
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;
    const mix = body.mix || { mcq: 0, descriptive: 0, video: 0, coding: 0 };
    const total = (mix.mcq || 0) + (mix.descriptive || 0) + (mix.video || 0) + (mix.coding || 0);
    if (total === 0) {
      return new Response(JSON.stringify({ error: "Question mix must total > 0" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (total > 5) {
      return new Response(JSON.stringify({ error: "Max 5 questions per call — batch on the client" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sourceText =
      body.source_mode === "jd"
        ? `JOB DESCRIPTION:\n${(body.jd_text || "").slice(0, 8000)}`
        : `TOPIC / SKILLS:\n${(body.topic_or_skills || "").slice(0, 4000)}`;

    const difficulty = body.difficulty || "medium";
    const codingLang = body.language || "python";

    const systemPrompt = `You are an expert assessment author for Indian undergraduate students.
Generate high-quality questions that strictly match the requested mix.
Return ONLY valid JSON. Do not include markdown fences or commentary.`;

    const userPrompt = `${sourceText}

Generate exactly:
- ${mix.mcq} MCQ questions (4 options each, exactly one correct, include short explanation)
- ${mix.descriptive} Descriptive questions (open-ended, with a model "expected_answer" rubric of 2-4 sentences)
- ${mix.video} Video-response questions (the student records a short verbal answer; include "expected_answer" rubric of 2-4 sentences and "time_limit_seconds" between 60 and 180)
- ${mix.coding} Coding questions (in ${codingLang}; include "starter_code" and "expected_answer" describing the correct approach + sample I/O)

Difficulty: ${difficulty}.

Return JSON shaped exactly like:
{
  "questions": [
    {
      "question_type": "mcq" | "descriptive" | "video" | "coding",
      "question": "string",
      "options": ["A","B","C","D"],          // mcq only, otherwise []
      "correct": 0,                            // mcq only (0-3), otherwise null
      "explanation": "string",                 // mcq: why correct
      "expected_answer": "string",             // descriptive/video/coding rubric, "" for mcq
      "max_score": 1,                          // 1 for mcq, 5 for descriptive/video, 10 for coding
      "time_limit_seconds": null,              // video only (60-180), else null
      "starter_code": "",                      // coding only, else ""
      "language": ""                            // coding only (e.g. "python"), else ""
    }
  ]
}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error", aiRes.status, errText);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit hit. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in workspace settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const raw = aiJson.choices?.[0]?.message?.content || "{}";
    let parsed: { questions: any[] } = { questions: [] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("Failed to parse AI JSON", raw.slice(0, 500));
      return new Response(JSON.stringify({ error: "AI returned invalid JSON" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize/validate
    const questions = (parsed.questions || []).map((q: any) => ({
      question_type: ["mcq", "descriptive", "video", "coding"].includes(q.question_type) ? q.question_type : "mcq",
      question: String(q.question || "").trim(),
      options: Array.isArray(q.options) ? q.options.map(String) : [],
      correct: typeof q.correct === "number" ? q.correct : null,
      explanation: String(q.explanation || ""),
      expected_answer: String(q.expected_answer || ""),
      max_score: Number.isFinite(q.max_score) ? Math.max(1, Math.min(20, q.max_score)) : 1,
      time_limit_seconds: q.question_type === "video" ? (Number.isFinite(q.time_limit_seconds) ? q.time_limit_seconds : 120) : null,
      starter_code: String(q.starter_code || ""),
      language: String(q.language || (q.question_type === "coding" ? codingLang : "")),
    })).filter((q: any) => q.question.length > 0);

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-assessment-questions error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
