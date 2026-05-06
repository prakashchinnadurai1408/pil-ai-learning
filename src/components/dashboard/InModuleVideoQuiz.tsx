import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ListChecks, Clock, CheckCircle2, XCircle, Sparkles, RotateCcw, Trophy, BookOpen } from "lucide-react";
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
  savedAt: number;
}

const storageKey = (lessonId: string, studentId: string) => `videoQuiz:${lessonId}:${studentId}`;

const InModuleVideoQuiz = ({ videoTitle, youtubeId, durationSeconds, moduleId, onSeek, onChapters }: Props) => {
  const studentId = sessionStorage.getItem("studentId") || "";
  const studentName = sessionStorage.getItem("studentName") || "Student";

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
  const qRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

  // Restore saved state when both lessonId & questions are ready
  useEffect(() => {
    if (!lessonId || questions.length === 0 || resumed) return;
    try {
      const raw = localStorage.getItem(storageKey(lessonId, studentId));
      if (!raw) { setResumed(true); return; }
      const saved: SavedState = JSON.parse(raw);
      setAnswers(saved.answers || {});
      if (saved.submitted) {
        setSubmitted(true);
        setScore(saved.score || 0);
      } else if (saved.remaining && saved.remaining > 0) {
        const total = questions.length * 60;
        const elapsed = total - saved.remaining;
        setStartedAt(Date.now() - elapsed * 1000);
        toast.info(`Resumed quiz · ${fmt(saved.remaining)} remaining`);
      }
    } catch {/* ignore */}
    setResumed(true);
  }, [lessonId, questions, studentId, resumed]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt, submitted, questions.length]);

  // Persist progress on every change
  useEffect(() => {
    if (!lessonId || !resumed) return;
    const saved: SavedState = {
      answers,
      remaining: timeLeft,
      submitted,
      score,
      savedAt: Date.now(),
    };
    try { localStorage.setItem(storageKey(lessonId, studentId), JSON.stringify(saved)); } catch {/* ignore */}
  }, [answers, timeLeft, submitted, score, lessonId, studentId, resumed]);

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

  const submit = async () => {
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
  };

  const retake = () => {
    if (!lessonId) return;
    try { localStorage.removeItem(storageKey(lessonId, studentId)); } catch {/* ignore */}
    setAnswers({});
    setSubmitted(false);
    setScore(0);
    setStartedAt(null);
    setTimeLeft(null);
  };

  const jumpTo = (q: Question) => {
    setActiveQid(q.id);
    onSeek?.(q.chapter_start_seconds);
    qRefs.current[q.id]?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const chapters = useMemo(() => {
    const seen = new Set<number>();
    return questions
      .filter((q) => (seen.has(q.chapter_index) ? false : (seen.add(q.chapter_index), true)))
      .map((q) => ({ index: q.chapter_index, title: q.chapter_title, start: q.chapter_start_seconds, qid: q.id }));
  }, [questions]);

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

  // Active quiz
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur py-1 z-10">
        <p className="text-sm font-semibold">Video quiz</p>
        {timeLeft !== null && (
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {fmt(timeLeft)}
          </Badge>
        )}
      </div>

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
        return (
          <div
            key={q.id}
            ref={(el) => (qRefs.current[q.id] = el)}
            className={`p-3 rounded-lg border space-y-2 ${activeQid === q.id ? "border-primary ring-1 ring-primary" : "border-border"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">{qi + 1}. {q.question}</p>
              <button
                onClick={() => { onSeek?.(q.chapter_start_seconds); setActiveQid(q.id); }}
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
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
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
      <Button onClick={submit} className="w-full">Submit quiz</Button>
    </div>
  );
};

export default InModuleVideoQuiz;
