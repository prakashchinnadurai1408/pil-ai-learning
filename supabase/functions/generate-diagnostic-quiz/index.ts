import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FALLBACK_QUESTIONS = [
  { question: "What does AI stand for?", options: ["Automatic Input", "Artificial Intelligence", "Advanced Internet", "Applied Iteration"], correct: 1, topic: "AI Basics" },
  { question: "Which of these is a Large Language Model?", options: ["Photoshop", "GPT-4", "Excel", "Chrome"], correct: 1, topic: "LLMs" },
  { question: "A 'prompt' in AI is:", options: ["A type of CPU", "Instructions you give to an AI", "A database", "A coding language"], correct: 1, topic: "Prompt Engineering" },
  { question: "What is Machine Learning?", options: ["Manual coding", "Computers learning from data", "A keyboard", "A new OS"], correct: 1, topic: "AI Basics" },
  { question: "Which is a multimodal AI capability?", options: ["Only text", "Text + image + audio", "Only images", "Only voice"], correct: 1, topic: "Multimodal AI" },
  { question: "An AI Agent typically:", options: ["Just answers", "Takes actions to achieve a goal", "Stores data", "Compresses files"], correct: 1, topic: "AI Agents" },
  { question: "RAG stands for:", options: ["Random Access Generation", "Retrieval-Augmented Generation", "Real-time AI Graphics", "Repeated AI Grouping"], correct: 1, topic: "RAG" },
  { question: "Which is the easiest way to start coding with AI?", options: ["Write assembly", "Use AI assistants like Copilot", "Avoid IDEs", "Use only notepad"], correct: 1, topic: "Coding with AI" },
  { question: "Tokens in LLMs are:", options: ["Coins", "Pieces of text the model processes", "User accounts", "Network packets"], correct: 1, topic: "LLMs" },
  { question: "Best practice for writing prompts:", options: ["Be vague", "Be specific & give context", "Use only one word", "Avoid examples"], correct: 1, topic: "Prompt Engineering" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ questions: FALLBACK_QUESTIONS, source: "fallback" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an expert AI curriculum designer. Generate exactly 10 multiple-choice diagnostic questions to assess a candidate's baseline AI knowledge for an Indian university audience.

Cover these topics evenly: AI Basics, Prompt Engineering, LLMs, Multimodal AI, AI Agents, RAG, Coding with AI.

Return ONLY valid JSON in this shape:
{
  "questions": [
    {
      "question": "string",
      "options": ["a","b","c","d"],
      "correct": 0,
      "topic": "string"
    }
  ]
}

Rules: 4 options each, "correct" is the 0-based index, mix difficulty (mostly easy/medium), Indian English.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate the diagnostic quiz now." },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResp.ok) {
      return new Response(JSON.stringify({ questions: FALLBACK_QUESTIONS, source: "fallback" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const content = aiJson.choices?.[0]?.message?.content || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = JSON.parse(content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim());
    }

    const qs = Array.isArray(parsed.questions) ? parsed.questions.slice(0, 10) : [];
    if (qs.length < 5) {
      return new Response(JSON.stringify({ questions: FALLBACK_QUESTIONS, source: "fallback" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ questions: qs, source: "ai" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("generate-diagnostic-quiz error", e);
    return new Response(JSON.stringify({ questions: FALLBACK_QUESTIONS, source: "fallback" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
