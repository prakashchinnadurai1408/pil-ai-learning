import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Upload, Loader2, Video, ListChecks, Clock, CheckCircle2, XCircle, Trash2, FileDown, FileText, NotebookPen, MessageSquareQuote, Save, RefreshCw, Pencil, RotateCcw, CloudCheck, CloudOff } from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";

interface NoteSection { heading: string; bullets: string[] }
interface Chapter { title: string; startSeconds: number }

interface Lesson {
  id: string;
  title: string;
  source_type: string;
  media_url: string;
  duration_seconds: number;
  generation_status: string;
  generation_error: string;
  created_at: string;
  transcript?: string;
  original_transcript?: string;
  transcript_updated_at?: string | null;
  summary?: string;
  notes?: NoteSection[];
  chapters?: Chapter[];
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

type DraftStatus = "idle" | "dirty" | "saving" | "saved";

const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const draftKey = (lessonId: string) => `videoQuiz:transcriptDraft:${lessonId}`;

const formatRelative = (iso?: string | null) => {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const LESSON_COLS = "id, title, source_type, media_url, duration_seconds, generation_status, generation_error, created_at, transcript, original_transcript, transcript_updated_at, summary, notes, chapters";

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
  const [editMode, setEditMode] = useState(false);
  const [editedSegments, setEditedSegments] = useState<Array<{ start: number; title?: string; text: string }>>([]);
  const [savingTranscript, setSavingTranscript] = useState(false);
  const [regenMode, setRegenMode] = useState<null | "mcqs" | "notes">(null);
  const [regenConfirm, setRegenConfirm] = useState<null | "mcqs" | "notes">(null);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [draftStatus, setDraftStatus] = useState<DraftStatus>("idle");
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const draftTimer = useRef<number | null>(null);

  const loadLessons = async () => {
    const { data } = await supabase.from("video_lessons")
      .select(LESSON_COLS)
      .eq("uploader_id", studentId || "")
      .order("created_at", { ascending: false }).limit(20);
    setLessons(((data as any[]) || []) as Lesson[]);
  };

  useEffect(() => { if (studentId) loadLessons(); }, [studentId]);

  useEffect(() => {
    if (!lessons.some((l) => l.generation_status === "running")) return;
    const t = setInterval(loadLessons, 3000);
    return () => clearInterval(t);
  }, [lessons]);

  // Build transcript segments from lesson.transcript + chapters.
  const buildSegments = useCallback((lesson: Lesson | null) => {
    const text = (lesson?.transcript || "").trim();
    const chapters = (lesson?.chapters || []) as Chapter[];
    if (!text) return [] as Array<{ start: number; title?: string; text: string }>;
    if (!chapters.length) return [{ start: 0, text }];
    const len = text.length;
    return chapters.map((ch, i) => {
      const startCh = Math.floor((i / chapters.length) * len);
      const endCh = i === chapters.length - 1 ? len : Math.floor(((i + 1) / chapters.length) * len);
      return { start: ch.startSeconds, title: ch.title, text: text.slice(startCh, endCh).trim() };
    });
  }, []);

  const transcriptSegments = useMemo(() => buildSegments(activeLesson), [activeLesson, buildSegments]);

  const loadQuestions = async (lesson: Lesson) => {
    setActiveLesson(lesson);
    setSubmitted(false);
    setAnswers({});
    setScore(0);
    setStartedAt(null);
    setEditMode(false);
    setDraftStatus("idle");
    setDraftSavedAt(null);
    const { data } = await supabase.from("video_lesson_questions")
      .select("*").eq("lesson_id", lesson.id).order("chapter_index").order("sort_order");
    setQuestions((data as Question[]) || []);

    // Restore unsaved draft if present.
    try {
      const raw = localStorage.getItem(draftKey(lesson.id));
      if (raw) {
        const parsed = JSON.parse(raw) as { segments: typeof editedSegments; savedAt: number };
        if (parsed?.segments?.length) {
          setEditedSegments(parsed.segments);
          setEditMode(true);
          setDraftStatus("saved");
          setDraftSavedAt(parsed.savedAt);
          toast.info("Restored unsaved transcript draft from your last session.");
        }
      }
    } catch { /* ignore */ }
  };

  // Auto-save draft to localStorage on edits (debounced).
  useEffect(() => {
    if (!editMode || !activeLesson) return;
    if (draftTimer.current) window.clearTimeout(draftTimer.current);
    setDraftStatus("dirty");
    draftTimer.current = window.setTimeout(() => {
      setDraftStatus("saving");
      try {
        const savedAt = Date.now();
        localStorage.setItem(draftKey(activeLesson.id), JSON.stringify({ segments: editedSegments, savedAt }));
        setDraftSavedAt(savedAt);
        setDraftStatus("saved");
      } catch {
        setDraftStatus("idle");
      }
    }, 800);
    return () => { if (draftTimer.current) window.clearTimeout(draftTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editedSegments, editMode, activeLesson?.id]);

  const refetchLesson = async (id: string): Promise<Lesson | null> => {
    const { data } = await supabase.from("video_lessons").select(LESSON_COLS).eq("id", id).single();
    return data ? (data as unknown as Lesson) : null;
  };

  const saveEditedTranscript = async () => {
    if (!activeLesson) return;
    setSavingTranscript(true);
    try {
      const joined = editedSegments.map((s) => s.text.trim()).filter(Boolean).join("\n\n").slice(0, 50000);
      const updates: Record<string, any> = {
        transcript: joined,
        transcript_updated_at: new Date().toISOString(),
      };
      // Snapshot original on first edit-save so Reset works.
      if (!activeLesson.original_transcript) {
        updates.original_transcript = activeLesson.transcript || "";
      }
      const { error } = await supabase.from("video_lessons").update(updates).eq("id", activeLesson.id);
      if (error) throw error;
      const merged: Lesson = { ...activeLesson, ...updates } as Lesson;
      setActiveLesson(merged);
      setLessons((ls) => ls.map((l) => l.id === activeLesson.id ? merged : l));
      try { localStorage.removeItem(draftKey(activeLesson.id)); } catch { /* ignore */ }
      setEditMode(false);
      setDraftStatus("idle");
      setDraftSavedAt(null);
      toast.success("Transcript saved — timestamps preserved");
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setSavingTranscript(false);
    }
  };

  const resetTranscript = async () => {
    if (!activeLesson) return;
    const original = activeLesson.original_transcript || "";
    if (!original) {
      toast.error("No original transcript snapshot is available for this lesson.");
      return;
    }
    try {
      const updates = { transcript: original, transcript_updated_at: new Date().toISOString() };
      const { error } = await supabase.from("video_lessons").update(updates).eq("id", activeLesson.id);
      if (error) throw error;
      const merged: Lesson = { ...activeLesson, ...updates } as Lesson;
      setActiveLesson(merged);
      setLessons((ls) => ls.map((l) => l.id === activeLesson.id ? merged : l));
      try { localStorage.removeItem(draftKey(activeLesson.id)); } catch { /* ignore */ }
      setEditMode(false);
      setEditedSegments([]);
      setDraftStatus("idle");
      setDraftSavedAt(null);
      toast.success("Transcript reset to the original upload.");
    } catch (e: any) {
      toast.error(e?.message || "Reset failed");
    }
  };

  const regenerate = async (mode: "mcqs" | "notes") => {
    if (!activeLesson) return;
    setRegenMode(mode);
    try {
      // Always re-fetch the latest saved transcript first.
      const fresh = await refetchLesson(activeLesson.id);
      if (!fresh) throw new Error("Lesson not found");
      const text = (fresh.transcript || "").trim();
      if (text.length < 100) { toast.error("Transcript is too short to regenerate"); return; }
      setActiveLesson(fresh);

      const { data, error } = await supabase.functions.invoke("generate-uploaded-video-mcqs", {
        body: {
          lessonId: fresh.id,
          transcript: text,
          title: fresh.title,
          mediaUrl: fresh.media_url,
          durationSeconds: fresh.duration_seconds,
          uploaderId: studentId,
          uploaderRole: "student",
          mode,
        },
      });
      if (error) throw error;
      const stamp = formatRelative(fresh.transcript_updated_at);
      toast.success(
        mode === "mcqs"
          ? `Regenerated ${data?.questionCount ?? 0} MCQs from transcript saved ${stamp} (${text.length} chars)`
          : `Regenerated notes & summary from transcript saved ${stamp} (${text.length} chars)`,
      );
      const reloaded = await refetchLesson(fresh.id);
      if (reloaded) {
        setActiveLesson(reloaded);
        setLessons((ls) => ls.map((x) => x.id === reloaded.id ? reloaded : x));
        if (mode === "mcqs") await loadQuestions(reloaded);
      }
    } catch (e: any) {
      toast.error(e?.message || "Regeneration failed");
    } finally {
      setRegenMode(null);
    }
  };

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

      const probedDuration = await new Promise<number>((resolve) => {
        const el = document.createElement("video");
        el.preload = "metadata";
        el.src = url;
        el.onloadedmetadata = () => resolve(Math.floor(el.duration) || 600);
        el.onerror = () => resolve(600);
      });
      setDuration(probedDuration);
      if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""));

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

      (window as any).__pendingVideoUrl = url;
      toast.success("Video uploaded — paste/edit transcript and click Generate");
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
      toast.success(`Generated ${data.questionCount} MCQs, summary & notes`);
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
    try { localStorage.removeItem(draftKey(l.id)); } catch { /* ignore */ }
    if (activeLesson?.id === l.id) { setActiveLesson(null); setQuestions([]); }
    loadLessons();
  };

  const exportStudyPack = () => {
    if (!activeLesson) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 40;
    const maxW = pageW - margin * 2;
    let y = margin;

    const ensureSpace = (lines = 1, lineH = 14) => {
      if (y + lines * lineH > pageH - margin) { doc.addPage(); y = margin; }
    };
    const writeWrapped = (text: string, opts: { size?: number; bold?: boolean; lineH?: number; gap?: number } = {}) => {
      const { size = 11, bold = false, lineH = 15, gap = 4 } = opts;
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(text || "", maxW) as string[];
      lines.forEach((ln) => { ensureSpace(1, lineH); doc.text(ln, margin, y); y += lineH; });
      y += gap;
    };

    writeWrapped(activeLesson.title || "Lesson study pack", { size: 18, bold: true, lineH: 22, gap: 6 });
    writeWrapped(`Student: ${studentName}   ·   Generated: ${new Date().toLocaleString()}`, { size: 9, gap: 10 });

    if (submitted) {
      writeWrapped(`Quiz Score: ${score}%  (${Object.values(answers).filter((a, i) => a === questions[i]?.correct).length}/${questions.length})`, { size: 12, bold: true, gap: 12 });
    }

    if (activeLesson.summary) {
      writeWrapped("Summary", { size: 14, bold: true, gap: 6 });
      writeWrapped(activeLesson.summary, { gap: 12 });
    }

    if (activeLesson.notes && activeLesson.notes.length) {
      writeWrapped("Structured Notes", { size: 14, bold: true, gap: 6 });
      activeLesson.notes.forEach((n) => {
        writeWrapped(n.heading, { size: 12, bold: true, gap: 2 });
        n.bullets.forEach((b) => writeWrapped(`•  ${b}`, { size: 11, gap: 2 }));
        y += 6;
      });
    }

    if (transcriptSegments.length) {
      doc.addPage(); y = margin;
      writeWrapped("Transcript", { size: 14, bold: true, gap: 6 });
      transcriptSegments.forEach((seg: any) => {
        writeWrapped(`[${formatTime(seg.start)}] ${seg.title || ""}`, { size: 11, bold: true, gap: 2 });
        writeWrapped(seg.text, { size: 10, gap: 10 });
      });
    }

    if (questions.length) {
      doc.addPage(); y = margin;
      writeWrapped("Quiz Review", { size: 14, bold: true, gap: 6 });
      questions.forEach((q, i) => {
        writeWrapped(`${i + 1}. ${q.question}  [@ ${formatTime(q.chapter_start_seconds)}]`, { size: 11, bold: true, gap: 2 });
        q.options.forEach((opt, oi) => {
          const marks: string[] = [];
          if (oi === q.correct) marks.push("✓ correct");
          if (submitted && answers[q.id] === oi && oi !== q.correct) marks.push("✗ your answer");
          if (submitted && answers[q.id] === oi && oi === q.correct) marks.push("← your answer");
          const tag = marks.length ? `   (${marks.join(", ")})` : "";
          writeWrapped(`   ${String.fromCharCode(65 + oi)}. ${opt}${tag}`, { size: 10, gap: 1 });
        });
        if (q.explanation) writeWrapped(`   Explanation: ${q.explanation}`, { size: 10, gap: 8 });
      });
    }

    const safeTitle = (activeLesson.title || "study-pack").replace(/[^a-z0-9-_]+/gi, "-").slice(0, 60);
    doc.save(`${safeTitle}-study-pack.pdf`);
    toast.success("Study pack downloaded");
  };

  const transcriptLen = (activeLesson?.transcript || "").length;
  const versionLabel = activeLesson
    ? `Transcript: ${transcriptLen.toLocaleString()} chars · saved ${formatRelative(activeLesson.transcript_updated_at)}`
    : "";

  const draftBadge = () => {
    if (!editMode) return null;
    const cls = "text-[10px] flex items-center gap-1";
    if (draftStatus === "dirty") return <Badge variant="outline" className={cls}><CloudOff className="h-3 w-3" /> Unsaved changes</Badge>;
    if (draftStatus === "saving") return <Badge variant="outline" className={cls}><Loader2 className="h-3 w-3 animate-spin" /> Saving draft…</Badge>;
    if (draftStatus === "saved") return <Badge variant="outline" className={cls}><CloudCheck className="h-3 w-3 text-success" /> Draft saved {draftSavedAt ? formatRelative(new Date(draftSavedAt).toISOString()) : ""}</Badge>;
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left: upload + library */}
      <div className="lg:col-span-1 space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Video className="h-4 w-4 text-primary" /> Upload Video → MCQs</CardTitle></CardHeader>
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
              Generate MCQs, notes & summary
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Your generated lessons</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {lessons.length === 0 && <p className="text-xs text-muted-foreground">No lessons yet.</p>}
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

      {/* Right: study pack tabs */}
      <Card className="lg:col-span-2">
        <CardHeader className="border-b border-border py-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <CardTitle className="text-sm truncate">{activeLesson ? activeLesson.title : "Pick a lesson"}</CardTitle>
              {activeLesson && <p className="text-[11px] text-muted-foreground mt-0.5">{versionLabel}</p>}
            </div>
            <div className="flex items-center gap-2">
              {timeLeft !== null && !submitted && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {formatTime(timeLeft)}
                </Badge>
              )}
              {activeLesson && (
                <>
                  <Button size="sm" variant="outline" disabled={regenMode !== null} onClick={() => setRegenConfirm("notes")}>
                    {regenMode === "notes" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                    Regenerate Notes & Summary
                  </Button>
                  <Button size="sm" variant="outline" disabled={regenMode !== null} onClick={() => setRegenConfirm("mcqs")}>
                    {regenMode === "mcqs" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                    Regenerate MCQs
                  </Button>
                  <Button size="sm" variant="outline" onClick={exportStudyPack}>
                    <FileDown className="h-3.5 w-3.5 mr-1" /> Study pack PDF
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {!activeLesson && (
            <p className="text-sm text-muted-foreground text-center py-8">Upload a video or pick an existing lesson.</p>
          )}

          {activeLesson && (
            <Tabs defaultValue="mcqs" className="w-full">
              <TabsList className="mb-3">
                <TabsTrigger value="mcqs"><ListChecks className="h-3.5 w-3.5 mr-1" />MCQs</TabsTrigger>
                <TabsTrigger value="summary"><MessageSquareQuote className="h-3.5 w-3.5 mr-1" />Summary</TabsTrigger>
                <TabsTrigger value="notes"><NotebookPen className="h-3.5 w-3.5 mr-1" />Notes</TabsTrigger>
                <TabsTrigger value="transcript"><FileText className="h-3.5 w-3.5 mr-1" />Transcript</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="space-y-2">
                {activeLesson.summary
                  ? <p className="text-sm leading-relaxed whitespace-pre-wrap">{activeLesson.summary}</p>
                  : <p className="text-sm text-muted-foreground">No summary available.</p>}
              </TabsContent>

              <TabsContent value="notes" className="space-y-4">
                {activeLesson.notes && activeLesson.notes.length > 0 ? activeLesson.notes.map((n, i) => (
                  <div key={i} className="p-3 rounded-lg border border-border">
                    <h4 className="text-sm font-semibold mb-2">{n.heading}</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {n.bullets.map((b, bi) => <li key={bi} className="text-sm text-muted-foreground">{b}</li>)}
                    </ul>
                  </div>
                )) : <p className="text-sm text-muted-foreground">No notes available.</p>}
              </TabsContent>

              <TabsContent value="transcript" className="space-y-3">
                {transcriptSegments.length === 0 && <p className="text-sm text-muted-foreground">No transcript saved.</p>}
                {transcriptSegments.length > 0 && (
                  <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs text-muted-foreground">Edits keep each segment’s timestamp anchored — only the text changes.</p>
                      {draftBadge()}
                    </div>
                    {!editMode ? (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => {
                          setEditedSegments(transcriptSegments.map((s: any) => ({ start: s.start, title: s.title, text: s.text })));
                          setEditMode(true);
                          setDraftStatus("idle");
                        }}>
                          <Pencil className="h-3.5 w-3.5 mr-1" /> Edit transcript
                        </Button>
                        {activeLesson.original_transcript && activeLesson.original_transcript !== activeLesson.transcript && (
                          <Button size="sm" variant="ghost" onClick={() => setResetConfirm(true)} className="text-muted-foreground">
                            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset to original
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setResetConfirm(true)}>
                          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => {
                          if (activeLesson) { try { localStorage.removeItem(draftKey(activeLesson.id)); } catch {} }
                          setEditMode(false);
                          setDraftStatus("idle");
                          setDraftSavedAt(null);
                        }}>Cancel</Button>
                        <Button size="sm" onClick={saveEditedTranscript} disabled={savingTranscript}>
                          {savingTranscript ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                          Save transcript
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                {(editMode ? editedSegments : transcriptSegments).map((seg: any, i) => (
                  <div key={i} className="p-3 rounded-lg border border-border">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge variant="outline" className="text-[10px]">{formatTime(seg.start)}</Badge>
                      {seg.title && <span className="text-xs font-medium text-foreground">{seg.title}</span>}
                    </div>
                    {editMode ? (
                      <Textarea
                        rows={5}
                        value={seg.text}
                        onChange={(e) => setEditedSegments((arr) => arr.map((s, si) => si === i ? { ...s, text: e.target.value } : s))}
                        className="text-xs"
                      />
                    ) : (
                      <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">{seg.text}</p>
                    )}
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="mcqs" className="space-y-3">
                {questions.length === 0 && <p className="text-sm text-muted-foreground">No questions for this lesson.</p>}
                {questions.length > 0 && !startedAt && !submitted && (
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
                        <p className="text-xs text-muted-foreground">Score saved · use “Study pack PDF” to export</p>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Confirm regenerate */}
      <AlertDialog open={regenConfirm !== null} onOpenChange={(o) => !o && setRegenConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {regenConfirm === "mcqs" ? "Regenerate MCQs?" : "Regenerate Notes & Summary?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {regenConfirm === "mcqs"
                ? "Your existing MCQs and any saved score for this lesson will be replaced. Notes and summary stay as-is."
                : "Your current summary and structured notes will be overwritten. MCQs stay as-is."}
              <br /><br />
              <span className="text-xs">Source: {versionLabel || "current transcript"}</span>
              {editMode && draftStatus !== "idle" && (
                <><br /><span className="text-xs text-warning">⚠ You have unsaved transcript edits — save them first if you want them used.</span></>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { const m = regenConfirm; setRegenConfirm(null); if (m) regenerate(m); }}>
              Yes, regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm reset transcript */}
      <AlertDialog open={resetConfirm} onOpenChange={setResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset transcript to original?</AlertDialogTitle>
            <AlertDialogDescription>
              This discards all of your timestamp-preserving edits and any unsaved draft, and restores the transcript that was first uploaded for this lesson. Notes, summary, and MCQs are not changed until you regenerate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep my edits</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setResetConfirm(false); resetTranscript(); }}>
              Yes, reset to original
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VideoQuizSandbox;
