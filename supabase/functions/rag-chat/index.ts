// Answers a student question grounded in a RAG document.
// Body: { documentId, question, embeddingModel?, history? }
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const { documentId, question, embeddingModel, history } = await req.json();
    if (!documentId || !question) return json({ error: "documentId and question required" }, 400);

    const { data: doc } = await supabase.from("rag_documents").select("embedding_model, file_name, topic").eq("id", documentId).maybeSingle();
    if (!doc) return json({ error: "document not found" }, 404);
    const model = embeddingModel || doc.embedding_model || "google/text-embedding-004";

    // Embed the question
    const embRes = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, input: [question] }),
    });
    if (!embRes.ok) {
      if (embRes.status === 429) return json({ error: "Rate limit reached. Please try again." }, 429);
      if (embRes.status === 402) return json({ error: "AI credits exhausted." }, 402);
      return json({ error: "embedding failed" }, 502);
    }
    const embJson = await embRes.json();
    const qVec = embJson?.data?.[0]?.embedding;
    if (!qVec) return json({ error: "no embedding returned" }, 502);

    // Vector search
    const { data: matches, error: matchErr } = await supabase.rpc("match_rag_chunks", {
      query_embedding: qVec,
      doc_id: documentId,
      match_count: 6,
    });
    if (matchErr) return json({ error: "search failed", details: matchErr.message }, 500);

    const citations = (matches || []).map((m: any, i: number) => ({
      id: m.id,
      ref: i + 1,
      chunkIndex: m.chunk_index,
      page: m.page_number,
      similarity: m.similarity,
      excerpt: String(m.content).slice(0, 240),
    }));

    const context = (matches || [])
      .map((m: any, i: number) => `[${i + 1}] (chunk ${m.chunk_index}${m.page_number ? `, page ${m.page_number}` : ""})\n${m.content}`)
      .join("\n\n---\n\n");

    const systemPrompt = `You are a study tutor answering questions strictly from the provided document excerpts.
Rules:
- Use ONLY information from the excerpts. If the answer is not in them, reply: "The document doesn't cover that."
- Cite sources inline using bracket markers like [1], [2] matching the excerpt numbers.
- Be concise (max 6 sentences) and pedagogical. Prefer bullet points where appropriate.
- Document context: "${doc.file_name}"${doc.topic ? ` — Topic: ${doc.topic}` : ""}.`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
      ...(Array.isArray(history) ? history.slice(-6) : []),
      { role: "user", content: `Excerpts:\n\n${context}\n\nQuestion: ${question}` },
    ];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages }),
    });
    if (!aiRes.ok) {
      if (aiRes.status === 429) return json({ error: "Rate limit reached." }, 429);
      if (aiRes.status === 402) return json({ error: "AI credits exhausted." }, 402);
      const t = await aiRes.text();
      return json({ error: "AI failed", details: t }, 502);
    }
    const aiJson = await aiRes.json();
    const answer = aiJson?.choices?.[0]?.message?.content || "No answer.";

    return json({ answer, citations });
  } catch (e) {
    console.error("rag-chat fatal:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
