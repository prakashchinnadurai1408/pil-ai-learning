import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, tool } = await req.json();

    // AI-05: Validate messages are non-empty
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "No messages provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter out empty messages
    const validMessages = messages.filter(
      (m: { content?: string }) => m.content && m.content.trim().length > 0
    );

    if (validMessages.length === 0) {
      return new Response(JSON.stringify({ error: "All messages are empty" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // AI-03: System prompt instructs model to use conversation context
    let systemPrompt = "You are Aira, an AI learning assistant for the PluginLive AI LearnHub platform. You help UG/PG students learn about AI concepts, prompt engineering, LLMs, RAG, AI agents, and more. Keep answers clear, educational, and practical. Use markdown formatting with headers, bullet points, and code blocks where appropriate. IMPORTANT: You have access to the full conversation history. Always reference and build upon earlier messages when relevant. If the student asks a follow-up question, connect it to your prior answers.";

    if (tool === "summarize") {
      systemPrompt = "You are a text summarization expert. Summarize the given text concisely while preserving key points. Use bullet points for clarity.";
    } else if (tool === "code") {
      systemPrompt = "You are an expert coding assistant. Generate clean, well-commented code based on the user's request. Always explain the code briefly.";
    } else if (tool === "explain") {
      systemPrompt = "You are an AI concept explainer. Explain AI concepts in simple terms with real-world examples. Use analogies when helpful.";
    } else if (tool === "quiz") {
      systemPrompt = "You are a quiz generator. Generate 5 multiple-choice questions on the given topic. Format each question with options A-D and provide the correct answer with a brief explanation at the end.";
    }

    // Handle language tool prefix
    if (typeof tool === "string" && tool.startsWith("lang:")) {
      const language = tool.slice(5);
      systemPrompt += ` IMPORTANT: You MUST respond entirely in ${language}. The user may write in any language but your response must always be in ${language}.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...validMessages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});