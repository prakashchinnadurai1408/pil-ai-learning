import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ListChecks, Clock, CheckCircle2, XCircle, Sparkles, RotateCcw, Trophy, BookOpen, Cloud, CloudOff, Keyboard, Crosshair } from "lucide-react";
import { toast } from "sonner";

interface Question {
  id: string;
  chapter_index: number;
  chapter_title: string;
  chapter_start_seconds: number;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

interface Props {
  videoTitle: string;
  youtubeId?: string;
  durationSeconds?: number;
  moduleId: number;
  onSeek?: (seconds: number) => void;
  onChapters?: (chapters: { index: number; title: string; start: number }[]) => void;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

interface SavedState {
  answers: Record<string, number>;
  remaining: number | null;
  submitted: boolean;
  score: number;
  lastQid?: string | null;
  savedAt: number;
}

const storageKey = (lessonId: string, studentId: string) => `videoQuiz:${lessonId}:${studentId}`;

const InModuleVideoQuiz = ({ videoTitle, youtubeId, durationSeconds, moduleId, onSeek, onChapters }: Props) => {
  const studentId = sessionStorage.getItem("studentId") || "";
  const studentName = sessionStorage.getItem("studentName") || "Student";
  const studentMobile = sessionStorage.getItem("studentMobile") || "";
  const canSync = !!(studentId && studentMobile);

  const [lessonId, setLessonId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [generating, setGenerating] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [resumed, setResumed] = useState(false);
  const [activeQid, setActiveQid] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "synced" | "offline">("idle");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const qRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const syncTimer = useRef<number | null>(null);

  // Reset on video change
  useEffect(() => {
    setLessonId(null);
    setQuestions([]);
    setAnswers({});
    setSubmitted(false);
    setScore(0);
    setStartedAt(null);
    setTimeLeft(null);
    setResumed(false);
    setActiveQid(null);
    setSyncStatus("idle");
  }, [youtubeId, videoTitle]);

  // Look up cached quiz on mount
  useEffect(() => {
    if (!youtubeId) return;
    let cancelled = false;
    (async () => {
      const { data: lesson } = await supabase
        .from("video_lessons")
        .select("id, generation_status")
        .eq("youtube_video_id", youtubeId)
        .eq("source_type", "lesson_quiz")
        .maybeSingle();
      if (cancelled || !lesson) return;
      setLessonId(lesson.id);
      if (lesson.generation_status === "success") {
        const { data: qs } = await supabase
          .from("video_lesson_questions")
          .select("*").eq("lesson_id", lesson.id)
          .order("chapter_index").order("sort_order");
        if (!cancelled) setQuestions((qs as Question[]) || []);
      }
    })();
    return () => { cancelled = true; };
  }, [youtubeId]);

  // Restore saved state — merge cloud + local using last-updated timestamp wins.
  useEffect(() => {
    if (!lessonId || questions.length === 0 || resumed) return;
    let cancelled = false;
    (async () => {
      let cloud: SavedState | null = null;
      let local: SavedState | null = null;

      if (canSync) {
        try {
          const { data, error } = await supabase.rpc("get_video_quiz_progress", {
            _student_id: studentId, _mobile: studentMobile, _lesson_id: lessonId,
          });
          const row = Array.isArray(data) ? data[0] : null;
          if (!error && row) {
            cloud = {
              answers: (row.answers as Record<string, number>) || {},
              remaining: row.remaining_seconds,
              submitted: !!row.submitted,
              score: row.score || 0,
              lastQid: row.last_question_id,
              savedAt: new Date(row.updated_at).getTime(),
            };
          }
        } catch { /* fall back */ }
      }

      try {
        const raw = localStorage.getItem(storageKey(lessonId, studentId));
        if (raw) local = JSON.parse(raw) as SavedState;
      } catch {/* ignore */}

      if (cancelled) return;

      // Conflict resolution: pick the most recently updated copy.
      let saved: SavedState | null = null;
      let source: "cloud" | "local" | null = null;
      if (cloud && local) {
        if ((cloud.savedAt || 0) >= (local.savedAt || 0)) { saved = cloud; source = "cloud"; }
        else { saved = local; source = "local"; }
      } else if (cloud) { saved = cloud; source = "cloud"; }
      else if (local) { saved = local; source = "local"; }

      if (!saved) { setResumed(true); if (canSync) setSyncStatus("synced"); return; }

      setAnswers(saved.answers || {});
      if (saved.submitted) {
        setSubmitted(true);
        setScore(saved.score || 0);
      } else if (saved.remaining && saved.remaining > 0) {
        const total = questions.length * 60;
        const elapsed = total - saved.remaining;
        setStartedAt(Date.now() - elapsed * 1000);

        const lastQ = (saved.lastQid && questions.find((q) => q.id === saved.lastQid)) || null;
        if (lastQ) {
          setActiveQid(lastQ.id);
          // Use verified seek so the player lands precisely on the segment.
          verifiedSeek(lastQ.chapter_start_seconds);
          setTimeout(() => qRefs.current[lastQ.id]?.scrollIntoView({ behavior: "smooth", block: "center" }), 200);
        }

        toast.info(`Resumed quiz · ${fmt(saved.remaining)} remaining (${source === "cloud" ? "synced" : "local"})`);
      }
      if (canSync) setSyncStatus("synced");
      // If local was newer than cloud, push local up immediately so other devices catch up.
      if (canSync && source === "local" && cloud && (local?.savedAt || 0) > (cloud.savedAt || 0)) {
        try {
          await supabase.rpc("upsert_video_quiz_progress", {
            _student_id: studentId, _mobile: studentMobile, _lesson_id: lessonId,
            _answers: saved.answers || {}, _remaining_seconds: saved.remaining,
            _submitted: saved.submitted, _score: saved.score, _last_question_id: saved.lastQid ?? null,
          });
        } catch {/* ignore */}
      }
      setResumed(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, questions, studentId, studentMobile, canSync, resumed]);

  // Notify parent of chapters
  useEffect(() => {
    if (!onChapters || questions.length === 0) return;
    const seen = new Set<number>();
    const chapters: { index: number; title: string; start: number }[] = [];
    questions.forEach((q) => {
      if (seen.has(q.chapter_index)) return;
      seen.add(q.chapter_index);
      chapters.push({ index: q.chapter_index, title: q.chapter_title, start: q.chapter_start_seconds });
    });
    onChapters(chapters);
  }, [questions, onChapters]);

  const submit = useCallback(async () => {
    if (submitted || !lessonId) return;
    let correct = 0;
    questions.forEach((q) => { if (answers[q.id] === q.correct) correct += 1; });
    const sc = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
    setScore(sc);
    setSubmitted(true);
    const time = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
    await supabase.from("video_quiz_attempts").insert({
      lesson_id: lessonId,
      student_id: studentId,
      student_name: studentName,
      total_questions: questions.length,
      correct_answers: correct,
      score: sc,
      time_taken_seconds: time,
      answers: questions.map((q) => ({ questionId: q.id, answer: answers[q.id] ?? null, correct: q.correct })),
    });
  }, [submitted, lessonId, questions, answers, startedAt, studentId, studentName]);

  // Timer
  useEffect(() => {
    if (!startedAt || submitted || questions.length === 0) return;
    const total = questions.length * 60;
    const tick = () => {
      const left = Math.max(0, total - Math.floor((Date.now() - startedAt) / 1000));
      setTimeLeft(left);
      if (left <= 0) submit();
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [startedAt, submitted, questions.length, submit]);

  // Persist progress (local immediately + debounced cloud sync)
  useEffect(() => {
    if (!lessonId || !resumed) return;
    const saved: SavedState = {
      answers, remaining: timeLeft, submitted, score, lastQid: activeQid, savedAt: Date.now(),
    };
    try { localStorage.setItem(storageKey(lessonId, studentId), JSON.stringify(saved)); } catch {/* ignore */}

    if (!studentId) return;
    setSyncStatus("syncing");
    if (syncTimer.current) window.clearTimeout(syncTimer.current);
    syncTimer.current = window.setTimeout(async () => {
      try {
        const { error } = await supabase.from("video_quiz_progress").upsert({
          lesson_id: lessonId,
          student_id: studentId,
          answers,
          remaining_seconds: timeLeft,
          submitted,
          score,
          last_question_id: activeQid,
        }, { onConflict: "lesson_id,student_id" });
        setSyncStatus(error ? "offline" : "synced");
      } catch {
        setSyncStatus("offline");
      }
    }, 800);
    return () => { if (syncTimer.current) window.clearTimeout(syncTimer.current); };
  }, [answers, timeLeft, submitted, score, activeQid, lessonId, studentId, resumed]);

  const generate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-lesson-video-quiz", {
        body: { videoTitle, youtubeId, durationSeconds, moduleId, studentId },
      });
      if (error) throw error;
      setLessonId(data.lessonId);
      setQuestions(data.questions || []);
      if (data.cached) toast.success("Loaded existing quiz");
      else toast.success(`Generated ${data.questionCount} MCQs`);
    } catch (e: any) {
      toast.error(e?.message || "Quiz generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const retake = () => {
    if (!lessonId) return;
    try { localStorage.removeItem(storageKey(lessonId, studentId)); } catch {/* ignore */}
    if (studentId) {
      supabase.from("video_quiz_progress")
        .delete()
        .eq("lesson_id", lessonId)
        .eq("student_id", studentId)
        .then(() => {/* noop */});
    }
    setAnswers({});
    setSubmitted(false);
    setScore(0);
    setStartedAt(null);
    setTimeLeft(null);
    setActiveQid(null);
  };

  const jumpTo = useCallback((q: Question) => {
    setActiveQid(q.id);
    onSeek?.(q.chapter_start_seconds);
    qRefs.current[q.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [onSeek]);

  const chapters = useMemo(() => {
    const seen = new Set<number>();
    return questions
      .filter((q) => (seen.has(q.chapter_index) ? false : (seen.add(q.chapter_index), true)))
      .map((q) => ({ index: q.chapter_index, title: q.chapter_title, start: q.chapter_start_seconds, qid: q.id }));
  }, [questions]);

  // Keyboard navigation: 1-9 / A-Z select option, J/K or ↑/↓ move between questions, Enter submits
  useEffect(() => {
    if (submitted || !startedAt || questions.length === 0) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;

      const currentIdx = activeQid ? questions.findIndex((q) => q.id === activeQid) : 0;
      const cur = questions[currentIdx] ?? questions[0];
      if (!cur) return;

      // Option selection: 1-9 or A-Z
      let optIdx = -1;
      if (/^[1-9]$/.test(e.key)) optIdx = parseInt(e.key, 10) - 1;
      else if (/^[a-zA-Z]$/.test(e.key)) optIdx = e.key.toUpperCase().charCodeAt(0) - 65;

      if (optIdx >= 0 && optIdx < cur.options.length) {
        e.preventDefault();
        setAnswers((a) => ({ ...a, [cur.id]: optIdx }));
        setActiveQid(cur.id);
        return;
      }

      if (e.key === "ArrowDown" || e.key === "j" || e.key === "J") {
        e.preventDefault();
        const next = questions[Math.min(questions.length - 1, currentIdx + 1)];
        if (next) jumpTo(next);
      } else if (e.key === "ArrowUp" || e.key === "k" || e.key === "K") {
        e.preventDefault();
        const prev = questions[Math.max(0, currentIdx - 1)];
        if (prev) jumpTo(prev);
      } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        submit();
      } else if (e.key === "?") {
        e.preventDefault();
        setShowShortcuts((s) => !s);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeQid, questions, submitted, startedAt, jumpTo, submit]);

  if (!youtubeId) {
    return <p className="text-xs text-muted-foreground p-3">Pick a YouTube video to enable quiz generation.</p>;
  }

  if (questions.length === 0) {
    return (
      <div className="p-4 rounded-lg border border-border bg-muted/30 text-center space-y-2">
        <p className="text-sm font-medium">Take a timed MCQ quiz on this video</p>
        <p className="text-xs text-muted-foreground">AI will generate ~10 questions you can answer in ~10 minutes.</p>
        <Button size="sm" onClick={generate} disabled={generating}>
          {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
          {generating ? "Generating…" : "Generate quiz"}
        </Button>
      </div>
    );
  }

  if (!startedAt && !submitted) {
    const hasProgress = Object.keys(answers).length > 0;
    return (
      <div className="p-4 rounded-lg border border-border bg-muted/30 text-center space-y-2">
        <p className="text-sm font-medium">{questions.length} questions ready</p>
        <p className="text-xs text-muted-foreground">60s per question · {fmt(questions.length * 60)} total</p>
        <Button size="sm" onClick={() => setStartedAt(Date.now())}>
          <ListChecks className="h-4 w-4 mr-2" /> {hasProgress ? "Resume quiz" : "Start quiz"}
        </Button>
      </div>
    );
  }

  // Post-submit review screen
  if (submitted) {
    const correctCount = questions.filter((q) => answers[q.id] === q.correct).length;
    const incorrectCount = questions.filter((q) => answers[q.id] !== undefined && answers[q.id] !== q.correct).length;
    const skippedCount = questions.length - correctCount - incorrectCount;
    return (
      <div className="space-y-3">
        <div className="p-4 rounded-lg border border-border bg-gradient-to-br from-primary/5 to-accent/5 text-center">
          <Trophy className="h-8 w-8 mx-auto text-primary mb-1" />
          <p className="text-3xl font-bold">{score}%</p>
          <p className="text-xs text-muted-foreground">{correctCount} of {questions.length} correct</p>
          <div className="flex items-center justify-center gap-3 mt-2 text-xs">
            <span className="text-success">✓ {correctCount} correct</span>
            <span className="text-destructive">✗ {incorrectCount} wrong</span>
            {skippedCount > 0 && <span className="text-muted-foreground">— {skippedCount} skipped</span>}
          </div>
          <Button size="sm" variant="outline" className="mt-3" onClick={retake}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Retake quiz
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Review answers</p>
        </div>

        {questions.map((q, qi) => {
          const picked = answers[q.id];
          const wasCorrect = picked === q.correct;
          const skipped = picked === undefined;
          return (
            <div
              key={q.id}
              ref={(el) => (qRefs.current[q.id] = el)}
              className={`p-3 rounded-lg border space-y-2 ${
                activeQid === q.id ? "ring-2 ring-primary" : ""
              } ${skipped ? "border-muted" : wasCorrect ? "border-success/40 bg-success/5" : "border-destructive/40 bg-destructive/5"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{qi + 1}. {q.question}</p>
                <button
                  onClick={() => jumpTo(q)}
                  className="text-[10px] shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border hover:bg-muted"
                  title="Jump to this segment in the video"
                >
                  <Clock className="h-3 w-3" /> {fmt(q.chapter_start_seconds)}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">Chapter: {q.chapter_title}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {q.options.map((opt, i) => {
                  const isPicked = picked === i;
                  const isCorrect = i === q.correct;
                  return (
                    <div
                      key={i}
                      className={`text-left text-sm p-2 rounded border ${
                        isCorrect ? "border-success bg-success/10" :
                        isPicked ? "border-destructive bg-destructive/10" :
                        "border-border opacity-70"
                      }`}
                    >
                      <span className="font-mono text-xs mr-2">{String.fromCharCode(65 + i)}.</span>{opt}
                      {isCorrect && <CheckCircle2 className="h-3 w-3 inline ml-2 text-success" />}
                      {isPicked && !isCorrect && <XCircle className="h-3 w-3 inline ml-2 text-destructive" />}
                      {isPicked && <span className="ml-2 text-[10px] font-medium">(your answer)</span>}
                    </div>
                  );
                })}
              </div>
              <div className="text-xs p-2 rounded bg-muted/50 border border-border">
                <span className="font-semibold">
                  {skipped ? "⏭ Skipped — " : wasCorrect ? "✅ Correct — " : "❌ Incorrect — "}
                </span>
                <span className="text-muted-foreground italic">{q.explanation || "No explanation provided."}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const SyncIcon = syncStatus === "offline" ? CloudOff : Cloud;
  const syncLabel = syncStatus === "synced" ? "Synced" : syncStatus === "syncing" ? "Syncing…" : syncStatus === "offline" ? "Offline" : "Local";

  // Active quiz
  return (
    <div className="space-y-3" ref={containerRef}>
      <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur py-1 z-10">
        <p className="text-sm font-semibold">Video quiz</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowShortcuts((s) => !s)}
            className="text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border hover:bg-muted"
            title="Keyboard shortcuts (?)"
          >
            <Keyboard className="h-3 w-3" /> Keys
          </button>
          {studentId && (
            <Badge variant="outline" className="flex items-center gap-1 text-[10px]" title={`Cloud sync: ${syncLabel}`}>
              <SyncIcon className={`h-3 w-3 ${syncStatus === "syncing" ? "animate-pulse" : ""}`} /> {syncLabel}
            </Badge>
          )}
          {timeLeft !== null && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {fmt(timeLeft)}
            </Badge>
          )}
        </div>
      </div>

      {showShortcuts && (
        <div className="p-2 rounded-lg border border-border bg-muted/30 text-[11px] grid grid-cols-2 gap-1">
          <div><kbd className="font-mono px-1 border rounded">1-9</kbd> / <kbd className="font-mono px-1 border rounded">A-D</kbd> select option</div>
          <div><kbd className="font-mono px-1 border rounded">↑</kbd>/<kbd className="font-mono px-1 border rounded">↓</kbd> or <kbd className="font-mono px-1 border rounded">J</kbd>/<kbd className="font-mono px-1 border rounded">K</kbd> next/prev</div>
          <div><kbd className="font-mono px-1 border rounded">Ctrl/⌘ + Enter</kbd> submit</div>
          <div><kbd className="font-mono px-1 border rounded">?</kbd> toggle this help</div>
        </div>
      )}

      {chapters.length > 1 && (
        <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-border bg-muted/20">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase mr-1 self-center">Chapters:</span>
          {chapters.map((c) => (
            <button
              key={c.index}
              onClick={() => {
                onSeek?.(c.start);
                qRefs.current[c.qid]?.scrollIntoView({ behavior: "smooth", block: "center" });
                setActiveQid(c.qid);
              }}
              className="text-[10px] px-2 py-0.5 rounded-full border border-border hover:bg-primary/10 hover:border-primary transition"
            >
              {fmt(c.start)} · {c.title.length > 24 ? c.title.slice(0, 24) + "…" : c.title}
            </button>
          ))}
        </div>
      )}

      {questions.map((q, qi) => {
        const picked = answers[q.id];
        const isActive = activeQid === q.id;
        return (
          <div
            key={q.id}
            ref={(el) => (qRefs.current[q.id] = el)}
            onClick={() => setActiveQid(q.id)}
            className={`p-3 rounded-lg border space-y-2 cursor-pointer ${isActive ? "border-primary ring-1 ring-primary" : "border-border"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">{qi + 1}. {q.question}</p>
              <button
                onClick={(e) => { e.stopPropagation(); jumpTo(q); }}
                className="text-[10px] shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border hover:bg-muted"
              >
                <Clock className="h-3 w-3" /> {fmt(q.chapter_start_seconds)}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {q.options.map((opt, i) => {
                const isPicked = picked === i;
                return (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setAnswers((a) => ({ ...a, [q.id]: i })); setActiveQid(q.id); }}
                    aria-pressed={isPicked}
                    className={`text-left text-sm p-2 rounded border transition ${
                      isPicked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <span className="font-mono text-xs mr-2">{String.fromCharCode(65 + i)}.</span>{opt}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      <Button onClick={submit} className="w-full">Submit quiz <span className="ml-2 text-[10px] opacity-70">(⌘/Ctrl + Enter)</span></Button>
    </div>
  );
};

export default InModuleVideoQuiz;
