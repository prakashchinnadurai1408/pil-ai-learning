import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { videoTitle, moduleName, questionCount = 5, ageGroup = "", difficulty = "" } = await req.json();

    if (!videoTitle || !moduleName) {
      return new Response(JSON.stringify({ error: "videoTitle and moduleName are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== Age-aware adaptive guidance =====
    const ageGuide = getAgeQuizGuide(ageGroup);
    const diff = (difficulty || ageGuide.defaultDifficulty).toLowerCase();
    const diffGuide = getDifficultyGuide(diff);

    const prompt = `You are an adaptive quiz generator for an Indian AI learning platform.

LEARNER AGE GROUP: ${ageGuide.label}
- Reading level: ${ageGuide.readingLevel}
- Tone & examples: ${ageGuide.toneAndExamples}

TARGET DIFFICULTY: ${diff.toUpperCase()}
- ${diffGuide}

Generate exactly ${questionCount} multiple-choice questions specifically about the topic "${videoTitle}" from the module "${moduleName}".

Each question must:
- Be directly relevant to the specific topic "${videoTitle}", NOT generic module-level questions
- Use vocabulary, sentence length and examples appropriate to the LEARNER AGE GROUP above
- Match the TARGET DIFFICULTY above
- Have exactly 4 options
- Have exactly 1 correct answer
- Include a brief, age-appropriate explanation

IMPORTANT: Generate DIFFERENT questions each time. Vary angles and sub-topics covered.

Respond ONLY with valid JSON in this exact format, no markdown:
[
  {
    "question": "...",
    "options": ["A", "B", "C", "D"],
    "correct": 0,
    "explanation": "..."
  }
]`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a quiz question generator. Always respond with valid JSON only, no markdown fences." },
          { role: "user", content: prompt },
        ],
        temperature: 1.0,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI API error:", errText);
      return new Response(JSON.stringify({ error: "Failed to generate quiz" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";

    // Strip markdown fences if present
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    const questions = JSON.parse(content);

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-video-quiz error:", err);
    return new Response(JSON.stringify({ error: "Internal error generating quiz" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============= Age + difficulty adaptive helpers =============
function getAgeQuizGuide(ageGroup: string) {
  const g = (ageGroup || "").trim();
  if (g === "10-14") return {
    label: "10–14 years",
    readingLevel: "grade 5-7 — short, simple sentences with very common words",
    toneAndExamples: "friendly and encouraging; use everyday examples (games, school, mobile apps, cartoons); avoid jargon",
    defaultDifficulty: "easy",
  };
  if (g === "15-18") return {
    label: "15–18 years",
    readingLevel: "grade 8-10 — clear conversational English",
    toneAndExamples: "relatable to high-schoolers (school projects, social media, smartphones, basic coding)",
    defaultDifficulty: "easy",
  };
  if (g === "19-22") return {
    label: "19–22 years",
    readingLevel: "college-level English; technical terms allowed when defined",
    toneAndExamples: "college-oriented (internships, real APIs, projects, startup scenarios)",
    defaultDifficulty: "medium",
  };
  if (g === "23+") return {
    label: "23+ years",
    readingLevel: "professional / postgraduate English",
    toneAndExamples: "professional (workplace automation, business outcomes, ROI, real-world deployments)",
    defaultDifficulty: "medium",
  };
  return {
    label: "general adult learner",
    readingLevel: "clear standard English",
    toneAndExamples: "broad real-world examples",
    defaultDifficulty: "easy",
  };
}

function getDifficultyGuide(diff: string) {
  switch ((diff || "").toLowerCase()) {
    case "hard":
      return "Hard: multi-step reasoning, nuanced distractors, advanced applications. Distractors should be plausible.";
    case "medium":
      return "Medium: requires understanding beyond memorization, one-step reasoning, moderate distractors.";
    case "easy":
    default:
      return "Easy: tests core definitions and basic recognition. Avoid trick questions.";
  }
}
