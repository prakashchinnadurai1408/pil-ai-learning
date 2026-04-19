// Semantic topic matcher using Lovable AI Gateway.
// Input: { items: [{ key, text }], topics: [{ id, title }] }
// Output: { matches: { [key]: topicId | null } }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { items, topics } = await req.json();
    if (!Array.isArray(items) || !Array.isArray(topics) || topics.length === 0) {
      return new Response(JSON.stringify({ matches: {} }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const topicList = topics
      .map((t: any, i: number) => `${i + 1}. [${t.id}] ${t.title}`)
      .join("\n");
    const itemList = items
      .map((it: any, i: number) => `${i + 1}. [${it.key}] ${String(it.text || "").slice(0, 400)}`)
      .join("\n");

    const systemPrompt =
      "You map learning videos to the most semantically appropriate topic from a fixed topic list. " +
      "Always pick exactly one topic id per item from the provided list. " +
      "If nothing fits well, still pick the closest topic id.";

    const userPrompt =
      `TOPICS:\n${topicList}\n\nITEMS:\n${itemList}\n\n` +
      `Return matches mapping each item key to the single best topic id.`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_matches",
              description: "Return best topic id for each item key.",
              parameters: {
                type: "object",
                properties: {
                  matches: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        key: { type: "string" },
                        topic_id: { type: "string" },
                      },
                      required: ["key", "topic_id"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["matches"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_matches" } },
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("AI gateway error", resp.status, text);
      // Degrade gracefully: return empty matches + fallback flag so client uses keyword fallback silently.
      const reason = resp.status === 402 ? "AI_CREDITS_EXHAUSTED"
        : resp.status === 429 ? "AI_RATE_LIMITED"
        : "AI_GATEWAY_ERROR";
      return new Response(JSON.stringify({ matches: {}, fallback: true, reason }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments ? JSON.parse(call.function.arguments) : { matches: [] };
    const validIds = new Set(topics.map((t: any) => t.id));
    const out: Record<string, string | null> = {};
    for (const m of args.matches || []) {
      if (m?.key && validIds.has(m.topic_id)) out[m.key] = m.topic_id;
    }
    return new Response(JSON.stringify({ matches: out }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("match-topics error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
