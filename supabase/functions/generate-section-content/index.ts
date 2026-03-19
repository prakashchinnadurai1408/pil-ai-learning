import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sectionPrompts: Record<string, (topic: string, moduleName: string) => string> = {
  videos: (topic, moduleName) => `Generate 3-5 video lesson suggestions for the topic "${topic}" in the module "${moduleName}". Each video should have a title, description, duration estimate, a YouTube search query, AND if you know a real YouTube video ID for a popular educational video on this exact topic, include it as "youtubeId". Only include youtubeId if you are confident the video exists.

Return ONLY valid JSON:
[{"title":"...","description":"...","duration":"12:30","youtubeQuery":"search query for youtube","youtubeId":"dQw4w9WgXcQ or null"}]`,

  ai_chat: (topic, moduleName) => `Generate 4-6 AI chat prompt suggestions for the topic "${topic}" in the module "${moduleName}". These are starter prompts that students can click to begin a conversation with an AI tutor about this topic.

Return ONLY valid JSON:
[{"prompt":"...","category":"concept|practice|example|comparison"}]`,

  tools: (topic, moduleName) => `Generate 3-4 AI tool exercises for the topic "${topic}" in the module "${moduleName}". Each tool exercise should have a title, description, tool type (summarize/code/explain/quiz), and a sample input.

Return ONLY valid JSON:
[{"title":"...","description":"...","toolType":"summarize|code|explain|quiz","sampleInput":"..."}]`,

  assessments: (topic, moduleName) => `Generate 8-10 multiple-choice questions for assessing knowledge on "${topic}" in the module "${moduleName}". Each question must have exactly 4 options, one correct answer (0-indexed), and an explanation.

Return ONLY valid JSON:
[{"question":"...","options":["A","B","C","D"],"correct":0,"explanation":"..."}]`,

  projects: (topic, moduleName) => `Generate 1-2 hands-on project ideas for the topic "${topic}" in the module "${moduleName}". Each project should have a title, description, difficulty (Beginner/Intermediate/Advanced), estimated time, required skills, and 5-6 implementation steps.

Return ONLY valid JSON:
[{"title":"...","description":"...","difficulty":"Beginner|Intermediate|Advanced","estimatedTime":"3-5 hours","skills":["skill1","skill2"],"steps":["step1","step2","step3","step4","step5"]}]`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sectionType, topic, moduleName } = await req.json();

    if (!sectionType || !topic || !moduleName) {
      return new Response(JSON.stringify({ error: "sectionType, topic, and moduleName are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const promptFn = sectionPrompts[sectionType];
    if (!promptFn) {
      return new Response(JSON.stringify({ error: `Invalid section type: ${sectionType}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an educational content generator. Always respond with valid JSON only, no markdown fences or extra text." },
          { role: "user", content: promptFn(topic, moduleName) },
        ],
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI API error:", errText);
      return new Response(JSON.stringify({ error: "Failed to generate content" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    const parsed = JSON.parse(content);

    return new Response(JSON.stringify({ content: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-section-content error:", err);
    return new Response(JSON.stringify({ error: "Internal error generating content" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
