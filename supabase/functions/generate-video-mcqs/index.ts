// Generates chapter-wise MCQs for a YouTube video.
// 1. Resolves video metadata + chapters via YouTube Data API v3 (description fallback for chapter timestamps).
// 2. Asks Lovable AI to produce 3 MCQs per detected chapter using only the title + chapter context.
// 3. Persists results into video_lessons (status, chapters) and video_lesson_questions.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const m = u.pathname.match(/\/embed\/([^/]+)/);
    if (m) return m[1];
    return null;
  } catch {
    return null;
  }
}

// Parse "MM:SS Chapter title" / "HH:MM:SS Chapter title" lines from a description.
function parseChapters(description: string, durationSeconds: number) {
  const lines = description.split(/\r?\n/);
  const re = /^\s*(?:[-•*]\s*)?((?:\d{1,2}:)?\d{1,2}:\d{2})\s+(.+?)\s*$/;
  const out: { title: string; startSeconds: number }[] = [];
  for (const line of lines) {
    const m = line.match(re);
    if (!m) continue;
    const parts = m[1].split(":").map(Number);
    let secs = 0;
    if (parts.length === 3) secs = parts[0] * 3600 + parts[1] * 60 + parts[2];
    else if (parts.length === 2) secs = parts[0] * 60 + parts[1];
    if (secs > durationSeconds) continue;
    out.push({ title: m[2].trim().slice(0, 120), startSeconds: secs });
  }
  // Must start at or near 0 to be a valid chapter list.
  if (out.length >= 2 && out[0].startSeconds <= 30) {
    return out.sort((a, b) => a.startSeconds - b.startSeconds);
  }
  return [];
}

// Build evenly-spaced fallback chapters if YouTube has none.
function fallbackChapters(durationSeconds: number, title: string) {
  const target = durationSeconds < 600 ? 3 : durationSeconds < 1800 ? 5 : 6;
  const span = Math.floor(durationSeconds / target);
  return Array.from({ length: target }, (_, i) => ({
    title: `${title} — Part ${i + 1}`,
    startSeconds: i * span,
  }));
}

// ISO 8601 PT#H#M#S → seconds
function isoDurationToSeconds(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (Number(m[1] || 0) * 3600) + (Number(m[2] || 0) * 60) + Number(m[3] || 0);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY");
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  let lessonId: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    const { youtubeUrl, title: titleOverride, moduleId, createdBy } = body ?? {};
    if (!youtubeUrl || typeof youtubeUrl !== "string") return json({ error: "youtubeUrl is required" }, 400);
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) return json({ error: "Could not parse a YouTube video ID from that URL." }, 400);

    // 1. Look up video metadata
    let videoTitle = titleOverride || "Untitled lesson";
    let description = "";
    let thumb = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    let duration = 0;

    if (YOUTUBE_API_KEY) {
      const metaRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`,
      );
      if (metaRes.ok) {
        const meta = await metaRes.json();
        const item = meta?.items?.[0];
        if (item) {
          videoTitle = titleOverride || item.snippet?.title || videoTitle;
          description = item.snippet?.description || "";
          thumb = item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || thumb;
          duration = isoDurationToSeconds(item.contentDetails?.duration || "");
        }
      } else {
        console.warn("YouTube metadata lookup failed:", metaRes.status);
      }
    }

    if (duration === 0) duration = 1800; // sensible default for AI prompting (30 min)

    let chapters = parseChapters(description, duration);
    if (chapters.length === 0) chapters = fallbackChapters(duration, videoTitle);
    // Cap to 8 chapters to keep AI cost predictable
    chapters = chapters.slice(0, 8);

    // 2. Insert/refresh lesson row in "running" state so the UI can poll
    const { data: lessonRow, error: insertErr } = await supabase
      .from("video_lessons")
      .insert({
        title: videoTitle,
        description: description.slice(0, 2000),
        youtube_url: youtubeUrl,
        youtube_video_id: videoId,
        thumbnail_url: thumb,
        duration_seconds: duration,
        module_id: moduleId ?? null,
        status: "draft",
        generation_status: "running",
        chapters,
        created_by: createdBy || "admin",
      })
      .select("id")
      .single();
    if (insertErr || !lessonRow) {
      console.error("video_lessons insert failed:", insertErr);
      return json({ error: "Could not create the lesson record." }, 500);
    }
    lessonId = lessonRow.id;

    // 3. Ask Lovable AI for chapter-wise MCQs via tool calling (structured output)
    const systemPrompt = `You are an expert instructional designer. For each provided video chapter, write three multiple-choice questions that test the most important concept in that chapter. Use the chapter title (and the video title for context) to infer likely content. Each question must have exactly 4 distinct, plausible options with one clearly correct answer. Keep questions clear, university-level, and free of ambiguity.`;

    const userPrompt = `Video title: "${videoTitle}"
Total duration: ${Math.round(duration / 60)} minutes
Chapters (in order):
${chapters.map((c, i) => `${i + 1}. [${Math.floor(c.startSeconds / 60)}:${String(c.startSeconds % 60).padStart(2, "0")}] ${c.title}`).join("\n")}

Generate three MCQs per chapter.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "submit_chapter_questions",
          description: "Return all generated questions grouped by chapter index.",
          parameters: {
            type: "object",
            properties: {
              chapters: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    chapter_index: { type: "number" },
                    questions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          question: { type: "string" },
                          options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
                          correct: { type: "number", minimum: 0, maximum: 3 },
                          explanation: { type: "string" },
                        },
                        required: ["question", "options", "correct", "explanation"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["chapter_index", "questions"],
                  additionalProperties: false,
                },
              },
            },
            required: ["chapters"],
            additionalProperties: false,
          },
        },
      },
    ];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "submit_chapter_questions" } },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errText);
      await supabase.from("video_lessons").update({
        generation_status: "failed",
        generation_error: aiRes.status === 429 ? "Rate limit reached. Try again shortly." :
                         aiRes.status === 402 ? "AI credits exhausted. Add credits to continue." :
                         `AI gateway returned ${aiRes.status}.`,
      }).eq("id", lessonId);
      return json({ error: "AI generation failed", status: aiRes.status }, aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 502);
    }

    const aiJson = await aiRes.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments;
    if (!args) {
      await supabase.from("video_lessons").update({ generation_status: "failed", generation_error: "AI returned no questions." }).eq("id", lessonId);
      return json({ error: "AI returned no structured output" }, 502);
    }

    let parsed: any;
    try { parsed = JSON.parse(args); } catch {
      await supabase.from("video_lessons").update({ generation_status: "failed", generation_error: "AI returned malformed output." }).eq("id", lessonId);
      return json({ error: "AI output could not be parsed" }, 502);
    }

    // 4. Persist questions
    const rows: any[] = [];
    for (const ch of parsed.chapters || []) {
      const idx = Math.max(0, Math.min(chapters.length - 1, Number(ch.chapter_index) || 0));
      const meta = chapters[idx];
      (ch.questions || []).slice(0, 5).forEach((q: any, qi: number) => {
        if (!q?.question || !Array.isArray(q?.options) || q.options.length !== 4) return;
        rows.push({
          lesson_id: lessonId,
          chapter_index: idx,
          chapter_title: meta?.title ?? "",
          chapter_start_seconds: meta?.startSeconds ?? 0,
          question: String(q.question).slice(0, 1000),
          options: q.options.map((o: any) => String(o).slice(0, 500)),
          correct: Math.max(0, Math.min(3, Number(q.correct) || 0)),
          explanation: String(q.explanation || "").slice(0, 1500),
          sort_order: qi,
        });
      });
    }

    if (rows.length) {
      const { error: qErr } = await supabase.from("video_lesson_questions").insert(rows);
      if (qErr) {
        console.error("question insert failed:", qErr);
        await supabase.from("video_lessons").update({ generation_status: "failed", generation_error: "Could not save the generated questions." }).eq("id", lessonId);
        return json({ error: "Failed to save questions" }, 500);
      }
    }

    await supabase.from("video_lessons").update({
      generation_status: rows.length ? "success" : "failed",
      generation_error: rows.length ? "" : "AI did not return any usable questions.",
    }).eq("id", lessonId);

    return json({ lessonId, questionCount: rows.length, chapterCount: chapters.length });
  } catch (err) {
    console.error("generate-video-mcqs fatal:", err);
    if (lessonId) {
      try { await supabase.from("video_lessons").update({ generation_status: "failed", generation_error: String(err).slice(0, 500) }).eq("id", lessonId); } catch { /* noop */ }
    }
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
