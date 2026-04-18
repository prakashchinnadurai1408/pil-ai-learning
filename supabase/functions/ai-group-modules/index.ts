// AI Agent that suggests grouping of modules into themed bundles.
// Returns: { groups: [{ name, description, module_ids: number[] }] }
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { modules, hint } = await req.json();
    if (!Array.isArray(modules) || modules.length === 0) {
      return new Response(JSON.stringify({ error: "modules array required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const moduleList = modules.map((m: any) => `- [${m.id}] ${m.title}`).join("\n");
    const sysPrompt = `You are a curriculum designer. Group the given AI-learning modules into 3-6 themed bundles based on topic, difficulty progression, and pedagogical flow. Each module must appear in exactly ONE group. Return ONLY valid JSON matching the schema. No prose.`;
    const userPrompt = `Modules:\n${moduleList}\n\n${hint ? `Additional hint: ${hint}\n\n` : ""}Return JSON: {"groups":[{"name":"...","description":"...","module_ids":[1,2,3]}]}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: sysPrompt }, { role: "user", content: userPrompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      return new Response(JSON.stringify({ error: `AI gateway: ${resp.status} ${t}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const raw = data.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    }
    const groups = Array.isArray(parsed.groups) ? parsed.groups : [];
    return new Response(JSON.stringify({ groups }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
