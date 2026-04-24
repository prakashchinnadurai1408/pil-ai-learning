// Embeds an uploaded RAG document into vector chunks.
// Body: { documentId: string, text: string, embeddingModel?: string }
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Naive but reliable text chunker: ~1000 chars per chunk, ~150 char overlap, breaks on whitespace.
function chunkText(text: string, size = 1000, overlap = 150) {
  const clean = text.replace(/\s+/g, " ").trim();
  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    let end = Math.min(i + size, clean.length);
    if (end < clean.length) {
      const ws = clean.lastIndexOf(" ", end);
      if (ws > i + size * 0.5) end = ws;
    }
    chunks.push(clean.slice(i, end).trim());
    if (end >= clean.length) break;
    i = Math.max(end - overlap, i + 1);
  }
  return chunks.filter((c) => c.length > 30);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  let documentId: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    documentId = body?.documentId;
    const text: string = body?.text || "";
    const embeddingModel: string = body?.embeddingModel || "google/text-embedding-004";
    if (!documentId || !text) return json({ error: "documentId and text are required" }, 400);

    await supabase.from("rag_documents").update({ status: "embedding", error_message: "" }).eq("id", documentId);

    const chunks = chunkText(text);
    if (chunks.length === 0) {
      await supabase.from("rag_documents").update({ status: "failed", error_message: "Document had no extractable text" }).eq("id", documentId);
      return json({ error: "no text" }, 400);
    }

    // Embed chunks in small batches via Lovable AI Gateway (OpenAI-compatible /embeddings)
    const rows: { document_id: string; chunk_index: number; content: string; embedding: number[] }[] = [];
    const batchSize = 16;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: embeddingModel, input: batch }),
      });
      if (!res.ok) {
        const t = await res.text();
        console.error("embeddings error:", res.status, t);
        if (res.status === 429 || res.status === 402) {
          await supabase.from("rag_documents").update({
            status: "failed",
            error_message: res.status === 429 ? "Rate limit hit. Try again shortly." : "AI credits exhausted.",
          }).eq("id", documentId);
          return json({ error: res.status === 429 ? "rate limit" : "credits" }, res.status);
        }
        await supabase.from("rag_documents").update({ status: "failed", error_message: `Embeddings API error ${res.status}` }).eq("id", documentId);
        return json({ error: "embeddings failed", details: t }, 502);
      }
      const data = await res.json();
      for (let k = 0; k < batch.length; k++) {
        const vec = data?.data?.[k]?.embedding;
        if (Array.isArray(vec)) {
          rows.push({ document_id: documentId, chunk_index: i + k, content: batch[k], embedding: vec });
        }
      }
    }

    if (rows.length === 0) {
      await supabase.from("rag_documents").update({ status: "failed", error_message: "No embeddings returned" }).eq("id", documentId);
      return json({ error: "no embeddings" }, 502);
    }

    // Insert in batches of 50 to avoid payload limits
    for (let i = 0; i < rows.length; i += 50) {
      const slice = rows.slice(i, i + 50);
      const { error } = await supabase.from("rag_document_chunks").insert(slice);
      if (error) {
        console.error("chunk insert error:", error);
        await supabase.from("rag_documents").update({ status: "failed", error_message: "Could not save chunks" }).eq("id", documentId);
        return json({ error: "save failed", details: error.message }, 500);
      }
    }

    await supabase.from("rag_documents").update({
      status: "ready",
      chunk_count: rows.length,
      embedding_model: embeddingModel,
    }).eq("id", documentId);

    return json({ documentId, chunkCount: rows.length });
  } catch (e) {
    console.error("rag-embed fatal:", e);
    if (documentId) {
      await supabase.from("rag_documents").update({ status: "failed", error_message: String(e).slice(0, 500) }).eq("id", documentId).catch(() => {});
    }
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
