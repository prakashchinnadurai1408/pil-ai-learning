import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, Loader2, Video, ListChecks, Clock, CheckCircle2, XCircle, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Lesson {
  id: string;
  title: string;
  source_type: string;
  media_url: string;
  duration_seconds: number;
  generation_status: string;
  generation_error: string;
  created_at: string;
}

interface Question {
  id: string;
  chapter_index: number;
  chapter_title: string;
  chapter_start_seconds: number;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  sort_order: number;
}

const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

const VideoQuizSandbox = () => {
  const studentId = sessionStorage.getItem("studentId");
  const studentName = sessionStorage.getItem("studentName") || "Student";

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(600);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lessonsLoadedRef = useRef(false);

  const loadLessons = async () => {
    const { data } = await supabase.from("video_lessons")
      .select("id, title, source_type, media_url, duration_seconds, generation_status, generation_error, created_at")
      .eq("uploader_id", studentId || "")
      .order("created_at", { ascending: false }).limit(20);
    setLessons((data as Lesson[]) || []);
    lessonsLoadedRef.current = true;
  };

  useEffect(() => { if (studentId) loadLessons(); }, [studentId]);

  // Poll for in-progress lessons
  useEffect(() => {
    if (!lessons.some((l) => l.generation_status === "running")) return;
    const t = setInterval(loadLessons, 3000);
    return () => clearInterval(t);
  }, [lessons]);

  const loadQuestions = async (lesson: Lesson) => {
    setActiveLesson(lesson);
    setSubmitted(false);
    setAnswers({});
    setScore(0);
    setStartedAt(null);
    const { data } = await supabase.from("video_lesson_questions")
      .select("*").eq("lesson_id", lesson.id).order("chapter_index").order("sort_order");
    setQuestions((data as Question[]) || []);
  };

  // Timer: 90s per question once started
  useEffect(() => {
    if (!startedAt || submitted) return;
    const total = questions.length * 90;
    const tick = () => {
      const used = Math.floor((Date.now() - startedAt) / 1000);
      const left = Math.max(0, total - used);
      setTimeLeft(left);
      if (left <= 0) onSubmitQuiz();
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [startedAt, submitted, questions.length]);

  const handleVideoUpload = async (file: File) => {
    if (!studentId) { toast.error("Sign in required"); return; }
    if (file.size > 80 * 1024 * 1024) { toast.error("Max 80MB"); return; }
    if (!file.type.startsWith("video/") && !file.type.startsWith("audio/")) {
      toast.error("Upload a video or audio file"); return;
    }
    setUploading(true);
    try {
      const path = `${studentId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("lesson-videos").upload(path, file);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("lesson-videos").getPublicUrl(path);
      const url = pub.publicUrl;

      // Probe duration via a hidden HTMLMediaElement
      const probedDuration = await new Promise<number>((resolve) => {
        const el = document.createElement("video");
        el.preload = "metadata";
        el.src = url;
        el.onloadedmetadata = () => resolve(Math.floor(el.duration) || 600);
        el.onerror = () => resolve(600);
      });
      setDuration(probedDuration);
      if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""));

      // Try to transcribe (Lovable AI accepts audio for short clips)
      setTranscribing(true);
      try {
        const buf = await file.arrayBuffer();
        if (buf.byteLength > 8 * 1024 * 1024) {
          toast.info("Large file — paste a transcript below for best results.");
        } else {
          const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
          const dataUrl = `data:${file.type};base64,${b64}`;
          const { data, error } = await supabase.functions.invoke("transcribe-audio", {
            body: { audioDataUrl: dataUrl, instructions: "Provide a clean transcript only, no commentary." },
          });
          if (!error && data?.text) setTranscript(data.text);
        }
      } catch (e) {
        console.warn("auto-transcribe failed", e);
      } finally {
        setTranscribing(false);
      }

      // Save URL on the form by stashing in state; lesson row created on Generate.
      (window as any).__pendingVideoUrl = url;
      toast.success("Video uploaded — paste/edit transcript and click Generate Quiz");
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (!transcript.trim() || transcript.trim().length < 100) {
      toast.error("Add a transcript of at least 100 characters"); return;
    }
    setGenerating(true);
    try {
      const mediaUrl = (window as any).__pendingVideoUrl || "";
      const { data, error } = await supabase.functions.invoke("generate-uploaded-video-mcqs", {
        body: {
          transcript,
          title: title || "Uploaded lesson",
          mediaUrl,
          durationSeconds: duration,
          uploaderId: studentId,
          uploaderRole: "student",
        },
      });
      if (error) throw error;
      toast.success(`Generated ${data.questionCount} MCQs across ${data.segmentCount} segments`);
      setTranscript("");
      setTitle("");
      (window as any).__pendingVideoUrl = "";
      loadLessons();
    } catch (e: any) {
      toast.error(e?.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const onSubmitQuiz = async () => {
    if (submitted || !activeLesson) return;
    let correct = 0;
    questions.forEach((q) => { if (answers[q.id] === q.correct) correct += 1; });
    const sc = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    setScore(sc);
    setSubmitted(true);
    const timeTaken = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
    await supabase.from("video_quiz_attempts").insert({
      lesson_id: activeLesson.id,
      student_id: studentId,
      student_name: studentName,
      total_questions: questions.length,
      correct_answers: correct,
      score: sc,
      time_taken_seconds: timeTaken,
      answers: questions.map((q) => ({ questionId: q.id, answer: answers[q.id] ?? null, correct: q.correct })),
    });
  };

  const onDeleteLesson = async (l: Lesson) => {
    if (!confirm(`Delete "${l.title}"?`)) return;
    await supabase.from("video_lessons").delete().eq("id", l.id);
    if (activeLesson?.id === l.id) { setActiveLesson(null); setQuestions([]); }
    loadLessons();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left: upload + library */}
      <div className="lg:col-span-1 space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Video className="h-4 w-4 text-primary" /> Video → MCQs</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload video / audio (≤80MB)
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="video/*,audio/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoUpload(f); e.target.value = ""; }}
            />
            <Input placeholder="Lesson title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                <span>Transcript</span>
                {transcribing && <span className="flex items-center gap-1 text-primary"><Loader2 className="h-3 w-3 animate-spin" /> auto-transcribing…</span>}
              </label>
              <Textarea
                rows={6}
                placeholder="Paste a transcript or let auto-transcription fill it"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={handleGenerate} disabled={generating || !transcript.trim()}>
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ListChecks className="h-4 w-4 mr-2" />}
              Generate timed quiz
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Your generated quizzes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {lessons.length === 0 && <p className="text-xs text-muted-foreground">No quizzes yet.</p>}
            {lessons.map((l) => (
              <div key={l.id} className={`p-2 rounded-lg border ${activeLesson?.id === l.id ? "border-primary bg-primary/5" : "border-border"}`}>
                <button className="w-full text-left" onClick={() => l.generation_status === "success" && loadQuestions(l)}>
                  <p className="text-sm font-medium truncate">{l.title}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{l.generation_status}</Badge>
                    {l.generation_status === "running" && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                  </div>
                  {l.generation_status === "failed" && <p className="text-[10px] text-destructive mt-0.5">{l.generation_error}</p>}
                </button>
                <div className="flex justify-end mt-1">
                  <Button size="sm" variant="ghost" onClick={() => onDeleteLesson(l)} className="h-6 px-2">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Right: quiz player */}
      <Card className="lg:col-span-2">
        <CardHeader className="border-b border-border py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">{activeLesson ? activeLesson.title : "Pick a quiz"}</CardTitle>
            {timeLeft !== null && !submitted && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {formatTime(timeLeft)}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {!activeLesson && (
            <p className="text-sm text-muted-foreground text-center py-8">Upload a video or pick an existing quiz.</p>
          )}
          {activeLesson && questions.length === 0 && (
            <p className="text-sm text-muted-foreground">No questions for this quiz.</p>
          )}
          {activeLesson && questions.length > 0 && !startedAt && !submitted && (
            <div className="text-center space-y-3 py-4">
              <p className="text-sm text-muted-foreground">{questions.length} questions · 90s each · {formatTime(questions.length * 90)} total</p>
              <Button onClick={() => setStartedAt(Date.now())}>Start timed quiz</Button>
            </div>
          )}
          {startedAt && (
            <div className="space-y-3">
              {questions.map((q, qi) => {
                const picked = answers[q.id];
                return (
                  <div key={q.id} className="p-3 rounded-lg border border-border space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{qi + 1}. {q.question}</p>
                      <Badge variant="outline" className="text-[10px]">@ {formatTime(q.chapter_start_seconds)}</Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, i) => {
                        const isPicked = picked === i;
                        const isCorrect = submitted && i === q.correct;
                        const isWrong = submitted && isPicked && i !== q.correct;
                        return (
                          <button
                            key={i}
                            disabled={submitted}
                            onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                            className={`text-left text-sm p-2 rounded border transition ${
                              isCorrect ? "border-success bg-success/10" :
                              isWrong ? "border-destructive bg-destructive/10" :
                              isPicked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                            }`}
                          >
                            <span className="font-mono text-xs mr-2">{String.fromCharCode(65 + i)}.</span>{opt}
                            {isCorrect && <CheckCircle2 className="h-3 w-3 inline ml-2 text-success" />}
                            {isWrong && <XCircle className="h-3 w-3 inline ml-2 text-destructive" />}
                          </button>
                        );
                      })}
                    </div>
                    {submitted && q.explanation && (
                      <p className="text-xs text-muted-foreground italic mt-1">💡 {q.explanation}</p>
                    )}
                  </div>
                );
              })}
              {!submitted ? (
                <Button onClick={onSubmitQuiz} className="w-full">Submit quiz</Button>
              ) : (
                <div className="p-4 rounded-lg bg-muted text-center">
                  <p className="text-2xl font-bold">{score}%</p>
                  <p className="text-xs text-muted-foreground">Score saved</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoQuizSandbox;
