import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Brain, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface DiagQuestion {
  question: string;
  options: string[];
  correct: number;
  topic: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  candidateId: string;
  candidateName: string;
  onComplete: (diagnostic: {
    score: number;
    correct_answers: number;
    total_questions: number;
    topic_breakdown: Record<string, { correct: number; total: number }>;
  }) => void;
}

const DiagnosticAssessmentDialog = ({ open, onOpenChange, candidateId, candidateName, onComplete }: Props) => {
  const [phase, setPhase] = useState<"intro" | "loading" | "quiz" | "submitting">("intro");
  const [questions, setQuestions] = useState<DiagQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);

  useEffect(() => {
    if (!open) {
      setPhase("intro");
      setQuestions([]);
      setCurrent(0);
      setAnswers([]);
    }
  }, [open]);

  const startQuiz = async () => {
    setPhase("loading");
    try {
      const { data, error } = await supabase.functions.invoke("generate-diagnostic-quiz", { body: {} });
      if (error || !data?.questions?.length) throw new Error("Failed to load quiz");
      setQuestions(data.questions);
      setAnswers(new Array(data.questions.length).fill(-1));
      setCurrent(0);
      setPhase("quiz");
    } catch (e: any) {
      toast.error(e.message || "Could not start diagnostic");
      setPhase("intro");
    }
  };

  const selectOption = (idx: number) => {
    const next = [...answers];
    next[current] = idx;
    setAnswers(next);
  };

  const submit = async () => {
    setPhase("submitting");
    let correct = 0;
    const topicBreakdown: Record<string, { correct: number; total: number }> = {};
    questions.forEach((q, i) => {
      const t = q.topic || "General";
      if (!topicBreakdown[t]) topicBreakdown[t] = { correct: 0, total: 0 };
      topicBreakdown[t].total += 1;
      if (answers[i] === q.correct) {
        correct += 1;
        topicBreakdown[t].correct += 1;
      }
    });
    const score = Math.round((correct / questions.length) * 100);

    await (supabase.from("candidate_diagnostic_results") as any).insert({
      candidate_id: candidateId,
      candidate_name: candidateName,
      score,
      total_questions: questions.length,
      correct_answers: correct,
      topic_breakdown: topicBreakdown,
      answers: answers.map((a, i) => ({ q: i, selected: a, correct: questions[i].correct })),
    });

    toast.success(`Diagnostic complete — scored ${score}%`);
    onComplete({ score, correct_answers: correct, total_questions: questions.length, topic_breakdown: topicBreakdown });
    onOpenChange(false);
  };

  const q = questions[current];
  const progressPct = questions.length ? Math.round(((current + 1) / questions.length) * 100) : 0;
  const allAnswered = answers.length > 0 && answers.every((a) => a >= 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" /> Diagnostic Assessment
          </DialogTitle>
        </DialogHeader>

        {phase === "intro" && (
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              Take a quick 10-question diagnostic so Prakash can build a learning path tailored to your current
              level. It only takes 3–5 minutes.
            </p>
            <ul className="text-sm space-y-1 text-card-foreground">
              <li>• 10 multiple-choice questions</li>
              <li>• Covers AI basics, prompts, LLMs, agents, RAG, and more</li>
              <li>• Your weak topics get prioritized in the path</li>
            </ul>
          </div>
        )}

        {phase === "loading" && (
          <div className="py-10 text-center">
            <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Generating your diagnostic quiz…</p>
          </div>
        )}

        {phase === "quiz" && q && (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Question {current + 1} of {questions.length}</span>
                <span>{q.topic}</span>
              </div>
              <Progress value={progressPct} className="h-2" />
            </div>
            <div>
              <p className="font-medium text-card-foreground mb-3">{q.question}</p>
              <RadioGroup value={answers[current] >= 0 ? String(answers[current]) : ""} onValueChange={(v) => selectOption(parseInt(v))}>
                {q.options.map((opt, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50">
                    <RadioGroupItem value={String(i)} id={`opt-${i}`} className="mt-0.5" />
                    <Label htmlFor={`opt-${i}`} className="text-sm cursor-pointer flex-1 leading-relaxed">{opt}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        )}

        {phase === "submitting" && (
          <div className="py-10 text-center">
            <CheckCircle2 className="h-10 w-10 mx-auto text-primary mb-3" />
            <p className="text-sm text-muted-foreground">Saving your results…</p>
          </div>
        )}

        <DialogFooter>
          {phase === "intro" && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={startQuiz} className="gap-2">
                <Sparkles className="h-4 w-4" /> Start Diagnostic
              </Button>
            </>
          )}
          {phase === "quiz" && (
            <div className="flex gap-2 w-full justify-between">
              <Button variant="outline" disabled={current === 0} onClick={() => setCurrent(current - 1)}>
                Previous
              </Button>
              {current < questions.length - 1 ? (
                <Button disabled={answers[current] < 0} onClick={() => setCurrent(current + 1)}>
                  Next
                </Button>
              ) : (
                <Button disabled={!allAnswered} onClick={submit} className="gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Submit & Generate Path
                </Button>
              )}
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DiagnosticAssessmentDialog;
