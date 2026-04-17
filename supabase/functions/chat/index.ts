import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Approx pricing in USD per 1K tokens (input+output averaged) for cost estimation only.
const PRICE_PER_1K: Record<string, number> = {
  "google/gemini-2.5-flash": 0.0003,
  "google/gemini-2.5-flash-lite": 0.0001,
  "google/gemini-2.5-pro": 0.005,
  "google/gemini-3-flash-preview": 0.0004,
  "google/gemini-3.1-pro-preview": 0.006,
  "openai/gpt-5-nano": 0.0002,
  "openai/gpt-5-mini": 0.0008,
  "openai/gpt-5": 0.01,
  "openai/gpt-5.2": 0.012,
};

function estimateCost(model: string, totalTokens: number) {
  const rate = PRICE_PER_1K[model] ?? 0.0005;
  return (totalTokens / 1000) * rate;
}

async function logUsage(opts: {
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  status: string;
  userRole: string;
  userName: string;
  userId: string;
  feature: string;
}) {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return;
    const sb = createClient(url, key);
    const total = opts.promptTokens + opts.completionTokens;
    await sb.from("llm_usage_logs").insert({
      provider: opts.provider,
      model: opts.model,
      prompt_tokens: opts.promptTokens,
      completion_tokens: opts.completionTokens,
      total_tokens: total,
      estimated_cost_usd: estimateCost(opts.model, total),
      latency_ms: opts.latencyMs,
      status: opts.status,
      user_role: opts.userRole || "student",
      user_name: opts.userName || "",
      user_id: opts.userId || "",
      feature: opts.feature || "chat",
    });
  } catch (e) {
    console.error("logUsage failed:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = Date.now();

  try {
    const { messages, tool, studentContext, userMeta } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "No messages provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Resolve default model from llm_settings if available
    let model = "google/gemini-2.5-flash";
    let provider = "lovable";
    try {
      const url = Deno.env.get("SUPABASE_URL");
      const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (url && key) {
        const sb = createClient(url, key);
        const { data } = await sb.from("llm_settings").select("default_provider, default_model").limit(1).maybeSingle();
        if (data?.default_model) model = data.default_model;
        if (data?.default_provider) provider = data.default_provider;
      }
    } catch (_) { /* fall back to defaults */ }

    let systemPrompt = "You are Aira, an AI learning assistant for the PluginLive AI LearnHub platform. You help UG/PG students learn about AI concepts, prompt engineering, LLMs, RAG, AI agents, and more. Keep answers clear, educational, and practical. Use markdown formatting with headers, bullet points, and code blocks where appropriate. IMPORTANT: You have access to the full conversation history. Always reference and build upon earlier messages when relevant. If the student asks a follow-up question, connect it to your prior answers.";

    if (studentContext && typeof studentContext === "object") {
      const ctx = studentContext;
      systemPrompt += `\n\nSTUDENT LEARNING CONTEXT (use this to personalize your responses):
- Modules completed: ${ctx.completedModules || 0}/${ctx.totalModules || 10}
- Average quiz score: ${ctx.avgQuizScore || 0}%
- Assessments taken: ${ctx.assessmentCount || 0}, avg score: ${ctx.avgAssessmentScore || 0}%
- Coding challenges solved: ${ctx.codingSolved || 0}
- Current learning paths: ${ctx.pathNames || "None assigned"}
- Weak areas: ${ctx.weakAreas || "Not yet determined"}

When the student asks for help, adapt your explanations to their level. If they have low scores in certain areas, provide more foundational explanations. If they're advanced, provide deeper insights. When they ask for advice, reference their actual progress data.`;
    }

    if (tool === "summarize") {
      systemPrompt = "You are a text summarization expert. Summarize the given text concisely while preserving key points. Use bullet points for clarity.";
    } else if (tool === "code") {
      systemPrompt = "You are an expert coding assistant. Generate clean, well-commented code based on the user's request. Always explain the code briefly.";
    } else if (tool === "explain") {
      systemPrompt = "You are an AI concept explainer. Explain AI concepts in simple terms with real-world examples. Use analogies when helpful.";
    } else if (tool === "quiz") {
      systemPrompt = "You are a quiz generator. Generate 5 multiple-choice questions on the given topic. Format each question with options A-D and provide the correct answer with a brief explanation at the end.";
    }

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
        model,
        messages: [
          { role: "system", content: systemPrompt },
          ...validMessages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      await logUsage({
        provider, model, promptTokens: 0, completionTokens: 0,
        latencyMs: Date.now() - startedAt, status: `error_${response.status}`,
        userRole: userMeta?.role || "student", userName: userMeta?.name || "",
        userId: userMeta?.id || "", feature: typeof tool === "string" ? tool : "chat",
      });
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits to continue." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tee the stream so we can passthrough to the client AND collect token counts.
    const [clientStream, logStream] = response.body!.tee();

    // Background: parse the log stream for usage info, then write to DB.
    (async () => {
      let promptTokens = 0;
      let completionTokens = 0;
      let charCount = 0;
      const reader = logStream.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const json = JSON.parse(payload);
              const delta = json.choices?.[0]?.delta?.content;
              if (typeof delta === "string") charCount += delta.length;
              if (json.usage) {
                promptTokens = json.usage.prompt_tokens || promptTokens;
                completionTokens = json.usage.completion_tokens || completionTokens;
              }
            } catch (_) { /* ignore parse errors */ }
          }
        }
      } catch (e) {
        console.error("log stream read failed", e);
      }
      // If usage object wasn't sent, estimate completion tokens from char count (~4 chars/token).
      if (completionTokens === 0 && charCount > 0) completionTokens = Math.ceil(charCount / 4);
      if (promptTokens === 0) {
        const promptChars = validMessages.reduce((s: number, m: { content: string }) => s + (m.content?.length || 0), 0)
          + systemPrompt.length;
        promptTokens = Math.ceil(promptChars / 4);
      }
      await logUsage({
        provider, model, promptTokens, completionTokens,
        latencyMs: Date.now() - startedAt, status: "success",
        userRole: userMeta?.role || "student", userName: userMeta?.name || "",
        userId: userMeta?.id || "", feature: typeof tool === "string" ? tool : "chat",
      });
    })();

    return new Response(clientStream, {
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
