import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { videoTitle, moduleName, questionCount = 5 } = await req.json();

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

    const prompt = `You are a quiz generator for an AI learning platform. Generate exactly ${questionCount} multiple-choice questions specifically about the topic "${videoTitle}" from the module "${moduleName}".

Each question must:
- Be directly relevant to the specific video lesson topic "${videoTitle}", NOT generic module-level questions
- Have exactly 4 options
- Have exactly 1 correct answer
- Include a brief explanation

IMPORTANT: Generate DIFFERENT questions each time. Vary the difficulty, angles, and specific sub-topics covered.

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
