import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { category, difficulty, count, ageGroup = "" } = await req.json();
    const numChallenges = Math.min(Math.max(count || 5, 1), 5);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const ageGuide = getAgeChallengeGuide(ageGroup);
    const effectiveDifficulty = difficulty || ageGuide.defaultDifficulty;

    const prompt = `Generate exactly ${numChallenges} unique programming challenges for Indian students.

LEARNER AGE GROUP: ${ageGuide.label}
- Reading level: ${ageGuide.readingLevel}
- Style: ${ageGuide.style}

Category: ${category || "Mixed"}
Difficulty: ${effectiveDifficulty}

Return ONLY a JSON array with objects having these exact fields:
- title (string, short descriptive title using age-appropriate wording)
- difficulty ("Easy", "Medium", or "Hard")
- category (one of: "Basics", "Loops", "Arrays", "Strings", "Recursion", "Math", "Data Structures")
- description (string, clear problem statement written for the LEARNER AGE GROUP above)
- sample_input (string or null, example input)
- sample_output (string, expected output for the sample input)

Make challenges progressively harder, but never exceed the requested Difficulty. Use examples and scenarios that match the age group's interests. Include clear, testable problems with unambiguous expected outputs.
Return ONLY the JSON array, no markdown, no explanation.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a programming challenge generator. Output ONLY valid JSON arrays." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI error:", aiRes.status, errText);
      if (aiRes.status === 429) throw new Error("AI rate limit reached. Please wait and try again.");
      if (aiRes.status === 402) throw new Error("AI credits exhausted. Please top up Lovable AI credits.");
      throw new Error(`AI service error: ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    let content = aiData.choices?.[0]?.message?.content || "";
    
    // Clean markdown fences if present
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    let challenges;
    try {
      challenges = JSON.parse(content);
    } catch {
      throw new Error("Failed to parse AI response as JSON");
    }

    if (!Array.isArray(challenges)) throw new Error("AI response is not an array");

    // Save to database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const rows = challenges.map((c: any) => ({
      title: c.title,
      difficulty: c.difficulty || "Easy",
      category: c.category || category || "Basics",
      description: c.description,
      sample_input: c.sample_input || c.sampleInput || null,
      sample_output: c.sample_output || c.sampleOutput || "",
      source: "ai",
    }));

    const { data, error } = await supabase.from("coding_challenges").insert(rows).select();
    if (error) {
      console.error("DB insert error:", error);
      throw new Error(`Database error: ${error.message}`);
    }

    return new Response(JSON.stringify({ challenges: data, count: data?.length || 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("generate-coding-challenges error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ============= Age-aware coding challenge helper =============
function getAgeChallengeGuide(ageGroup: string) {
  const g = (ageGroup || "").trim();
  if (g === "10-14") return {
    label: "10–14 years",
    readingLevel: "very simple English, short sentences",
    style: "fun, playful problem statements (games, animals, school) — print/format/basic loops only",
    defaultDifficulty: "Easy",
  };
  if (g === "15-18") return {
    label: "15–18 years",
    readingLevel: "clear conversational English",
    style: "high-school relatable scenarios (marks, music playlists, simple text processing)",
    defaultDifficulty: "Easy",
  };
  if (g === "19-22") return {
    label: "19–22 years",
    readingLevel: "college-level English; technical terms allowed",
    style: "college/internship style problems (data parsing, algorithms, mini real-world tasks)",
    defaultDifficulty: "Medium",
  };
  if (g === "23+") return {
    label: "23+ years",
    readingLevel: "professional / postgraduate English",
    style: "professional engineering scenarios (data pipelines, transformations, optimization)",
    defaultDifficulty: "Medium",
  };
  return {
    label: "general adult learner",
    readingLevel: "clear standard English",
    style: "broad real-world scenarios",
    defaultDifficulty: "Easy",
  };
}
