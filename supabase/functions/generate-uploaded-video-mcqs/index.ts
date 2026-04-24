// Generates timed MCQs for an uploaded lesson video using its transcript.
// Body: { lessonId, transcript, title?, durationSeconds? }
// If lessonId is omitted, a new video_lessons row is created with source_type='upload'.
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

  let lessonId: string | null = null;
  try {
    const body = await req.json();
    lessonId = body?.lessonId || null;
    const transcript: string = body?.transcript || "";
    const title: string = body?.title || "Uploaded lesson";
    const mediaUrl: string = body?.mediaUrl || "";
    const moduleId: number | null = body?.moduleId ?? null;
    const uploaderId: string = body?.uploaderId || "";
    const uploaderRole: string = body?.uploaderRole || "student";
    const durationSeconds: number = Number(body?.durationSeconds) || 600;
    if (!transcript || transcript.length < 100) return json({ error: "Transcript too short" }, 400);

    // Build/refresh lesson row
    if (!lessonId) {
      const { data, error } = await supabase.from("video_lessons").insert({
        title,
        description: "",
        youtube_url: "",
        youtube_video_id: "",
        thumbnail_url: "",
        duration_seconds: durationSeconds,
        module_id: moduleId,
        status: "draft",
        generation_status: "running",
        chapters: [],
        created_by: uploaderId || "student",
        source_type: "upload",
        media_url: mediaUrl,
        transcript: transcript.slice(0, 50000),
        uploader_id: uploaderId,
        uploader_role: uploaderRole,
      }).select("id").single();
      if (error || !data) return json({ error: "could not create lesson", details: error?.message }, 500);
      lessonId = data.id;
    } else {
      await supabase.from("video_lessons").update({
        generation_status: "running",
        transcript: transcript.slice(0, 50000),
        media_url: mediaUrl,
      }).eq("id", lessonId);
    }

    // Build evenly spaced timed segments based on duration
    const segCount = durationSeconds < 300 ? 3 : durationSeconds < 900 ? 5 : 6;
    const span = Math.floor(durationSeconds / segCount);
    const segments = Array.from({ length: segCount }, (_, i) => ({
      title: `Segment ${i + 1}`,
      startSeconds: i * span,
    }));

    const systemPrompt = `You are an instructional designer. From the transcript, generate timed MCQs grouped by lesson segment. Use ONLY facts present in the transcript. Each MCQ has 4 distinct options and one correct answer.`;
    const userPrompt = `Title: ${title}
Duration: ${durationSeconds}s, ${segCount} equal segments.
Transcript (truncated):\n${transcript.slice(0, 12000)}

Generate 2 MCQs per segment.`;

    const tools = [{
      type: "function",
      function: {
        name: "submit_segment_questions",
        description: "Return MCQs grouped by segment index.",
        parameters: {
          type: "object",
          properties: {
            segments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  segment_index: { type: "number" },
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
                required: ["segment_index", "questions"],
                additionalProperties: false,
              },
            },
          },
          required: ["segments"],
          additionalProperties: false,
        },
      },
    }];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        tools,
        tool_choice: { type: "function", function: { name: "submit_segment_questions" } },
      }),
    });
    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        await supabase.from("video_lessons").update({ generation_status: "failed", generation_error: "Rate limit reached." }).eq("id", lessonId);
        return json({ error: "Rate limit" }, 429);
      }
      if (aiRes.status === 402) {
        await supabase.from("video_lessons").update({ generation_status: "failed", generation_error: "AI credits exhausted." }).eq("id", lessonId);
        return json({ error: "Credits exhausted" }, 402);
      }
      const t = await aiRes.text();
      await supabase.from("video_lessons").update({ generation_status: "failed", generation_error: `AI ${aiRes.status}` }).eq("id", lessonId);
      return json({ error: "AI failed", details: t }, 502);
    }

    const aiJson = await aiRes.json();
    const args = aiJson?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) {
      await supabase.from("video_lessons").update({ generation_status: "failed", generation_error: "no questions" }).eq("id", lessonId);
      return json({ error: "no MCQs returned" }, 502);
    }
    const parsed = JSON.parse(args);

    await supabase.from("video_lesson_questions").delete().eq("lesson_id", lessonId);

    const rows: any[] = [];
    for (const seg of parsed.segments || []) {
      const idx = Math.max(0, Math.min(segments.length - 1, Number(seg.segment_index) || 0));
      const meta = segments[idx];
      (seg.questions || []).slice(0, 5).forEach((q: any, qi: number) => {
        if (!q?.question || !Array.isArray(q?.options) || q.options.length !== 4) return;
        rows.push({
          lesson_id: lessonId,
          chapter_index: idx,
          chapter_title: meta.title,
          chapter_start_seconds: meta.startSeconds,
          question: String(q.question).slice(0, 1000),
          options: q.options.map((o: any) => String(o).slice(0, 500)),
          correct: Math.max(0, Math.min(3, Number(q.correct) || 0)),
          explanation: String(q.explanation || "").slice(0, 1500),
          sort_order: qi,
        });
      });
    }
    if (rows.length) await supabase.from("video_lesson_questions").insert(rows);

    await supabase.from("video_lessons").update({
      generation_status: rows.length ? "success" : "failed",
      generation_error: rows.length ? "" : "No usable questions",
      chapters: segments,
    }).eq("id", lessonId);

    return json({ lessonId, questionCount: rows.length, segmentCount: segments.length });
  } catch (e) {
    console.error("generate-uploaded-video-mcqs fatal:", e);
    if (lessonId) {
      await supabase.from("video_lessons").update({ generation_status: "failed", generation_error: String(e).slice(0, 400) }).eq("id", lessonId).catch(() => {});
    }
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
