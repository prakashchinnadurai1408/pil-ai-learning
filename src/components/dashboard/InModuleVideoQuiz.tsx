import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ListChecks, Clock, CheckCircle2, XCircle, Sparkles } from "lucide-react";
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
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

const InModuleVideoQuiz = ({ videoTitle, youtubeId, durationSeconds, moduleId }: Props) => {
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

  // Reset on video change
  useEffect(() => {
    setLessonId(null);
    setQuestions([]);
    setAnswers({});
    setSubmitted(false);
    setStartedAt(null);
    setTimeLeft(null);
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
    return (
      <div className="p-4 rounded-lg border border-border bg-muted/30 text-center space-y-2">
        <p className="text-sm font-medium">{questions.length} questions ready</p>
        <p className="text-xs text-muted-foreground">60s per question · {fmt(questions.length * 60)} total</p>
        <Button size="sm" onClick={() => setStartedAt(Date.now())}>
          <ListChecks className="h-4 w-4 mr-2" /> Start quiz
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur py-1 z-10">
        <p className="text-sm font-semibold">Video quiz</p>
        {timeLeft !== null && !submitted && (
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {fmt(timeLeft)}
          </Badge>
        )}
      </div>
      {questions.map((q, qi) => {
        const picked = answers[q.id];
        return (
          <div key={q.id} className="p-3 rounded-lg border border-border space-y-2">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">{qi + 1}. {q.question}</p>
              <Badge variant="outline" className="text-[10px] shrink-0">@ {fmt(q.chapter_start_seconds)}</Badge>
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
              <p className="text-xs text-muted-foreground italic">💡 {q.explanation}</p>
            )}
          </div>
        );
      })}
      {!submitted ? (
        <Button onClick={submit} className="w-full">Submit quiz</Button>
      ) : (
        <div className="p-4 rounded-lg bg-muted text-center">
          <p className="text-2xl font-bold">{score}%</p>
          <p className="text-xs text-muted-foreground">Score saved to your profile</p>
        </div>
      )}
    </div>
  );
};

export default InModuleVideoQuiz;
