// Generates timed MCQs for a lesson video (YouTube or admin-published) on demand.
// Body: { videoTitle, youtubeId?, durationSeconds?, moduleId?, studentId?, transcript? }
// If a video_lessons row already exists for this youtubeId, returns its questions.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function parseDur(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY");
  if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  let lessonId: string | null = null;
  try {
    const body = await req.json();
    const videoTitle: string = (body?.videoTitle || "").toString().slice(0, 200);
    const youtubeId: string = (body?.youtubeId || "").toString();
    const moduleId: number | null = body?.moduleId ?? null;
    const studentId: string = body?.studentId || "";
    let transcript: string = (body?.transcript || "").toString();
    let duration: number = Number(body?.durationSeconds) || 0;

    if (!videoTitle) return json({ error: "videoTitle required" }, 400);

    // Reuse if a lesson-quiz row already exists for this youtubeId.
    if (youtubeId) {
      const { data: existing } = await supabase
        .from("video_lessons")
        .select("id, generation_status")
        .eq("youtube_video_id", youtubeId)
        .eq("source_type", "lesson_quiz")
        .maybeSingle();
      if (existing?.id) {
        const { data: qs } = await supabase
          .from("video_lesson_questions")
          .select("*").eq("lesson_id", existing.id)
          .order("chapter_index").order("sort_order");
        if (qs && qs.length) {
          return json({ lessonId: existing.id, questionCount: qs.length, questions: qs, cached: true });
        }
        lessonId = existing.id;
      }
    }

    // Fetch metadata from YouTube if id given
    let description = "";
    if (youtubeId && YOUTUBE_API_KEY) {
      try {
        const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${youtubeId}&key=${YOUTUBE_API_KEY}`);
        if (r.ok) {
          const d = await r.json();
          const item = d?.items?.[0];
          description = item?.snippet?.description || "";
          if (!duration) duration = parseDur(item?.contentDetails?.duration || "");
        }
      } catch { /* ignore */ }
    }
    if (!duration) duration = 600;

    // Build/upsert lesson row
    if (!lessonId) {
      const { data, error } = await supabase.from("video_lessons").insert({
        title: videoTitle,
        description: description.slice(0, 1500),
        youtube_url: youtubeId ? `https://youtu.be/${youtubeId}` : "",
        youtube_video_id: youtubeId,
        thumbnail_url: youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : "",
        duration_seconds: duration,
        module_id: moduleId,
        status: "published",
        generation_status: "running",
        chapters: [],
        created_by: "student",
        source_type: "lesson_quiz",
        media_url: "",
        transcript: transcript.slice(0, 50000),
        uploader_id: studentId,
        uploader_role: "student",
      }).select("id").single();
      if (error || !data) return json({ error: "could not create lesson", details: error?.message }, 500);
      lessonId = data.id;
    } else {
      await supabase.from("video_lessons").update({ generation_status: "running" }).eq("id", lessonId);
    }

    const segCount = duration < 300 ? 3 : duration < 900 ? 4 : 5;
    const span = Math.floor(duration / segCount);
    const segments = Array.from({ length: segCount }, (_, i) => ({
      title: `Part ${i + 1}`,
      startSeconds: i * span,
    }));

    const sourceContext = transcript && transcript.length > 200
      ? `Transcript:\n${transcript.slice(0, 8000)}`
      : `Video description:\n${description.slice(0, 4000)}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an expert instructional designer. From the provided lesson video, generate timed MCQs grouped by segment. Each MCQ must have 4 distinct, plausible options and exactly one correct answer. Be university-level and unambiguous." },
          { role: "user", content: `Lesson title: "${videoTitle}"
Duration: ${duration}s split into ${segCount} equal segments.
${sourceContext}

Generate 2 MCQs per segment.` },
        ],
        tools: [{
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
        }],
        tool_choice: { type: "function", function: { name: "submit_segment_questions" } },
      }),
    });

    if (!aiRes.ok) {
      const status = aiRes.status;
      const reason = status === 429 ? "Rate limit reached. Try again shortly." :
        status === 402 ? "AI credits exhausted." : `AI gateway returned ${status}.`;
      await supabase.from("video_lessons").update({ generation_status: "failed", generation_error: reason }).eq("id", lessonId);
      return json({ error: reason }, status === 429 || status === 402 ? status : 502);
    }
    const aiJson = await aiRes.json();
    const args = aiJson?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) {
      await supabase.from("video_lessons").update({ generation_status: "failed", generation_error: "no MCQs returned" }).eq("id", lessonId);
      return json({ error: "no MCQs returned" }, 502);
    }
    const parsed = JSON.parse(args);

    await supabase.from("video_lesson_questions").delete().eq("lesson_id", lessonId);
    const rows: any[] = [];
    for (const seg of parsed.segments || []) {
      const idx = Math.max(0, Math.min(segments.length - 1, Number(seg.segment_index) || 0));
      const meta = segments[idx];
      (seg.questions || []).slice(0, 4).forEach((q: any, qi: number) => {
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
      generation_error: rows.length ? "" : "AI returned no usable questions",
      chapters: segments,
    }).eq("id", lessonId);

    const { data: qs } = await supabase
      .from("video_lesson_questions")
      .select("*").eq("lesson_id", lessonId)
      .order("chapter_index").order("sort_order");

    return json({ lessonId, questionCount: rows.length, questions: qs || [], segmentCount: segments.length });
  } catch (e) {
    if (lessonId) {
      await supabase.from("video_lessons").update({
        generation_status: "failed",
        generation_error: String(e).slice(0, 400),
      }).eq("id", lessonId).catch(() => {});
    }
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
