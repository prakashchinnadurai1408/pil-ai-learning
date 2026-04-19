import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, RefreshCw, Trophy, FileText, Video, Code2, ListChecks, CheckCircle, XCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { AssessmentAttempt, AssessmentQuestion } from "@/hooks/useAssessments";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  attempt: AssessmentAttempt | null;
  assessmentTitle: string;
  passingScore: number;
  onSaved?: () => void;
}

type Grading = Record<string, { score: number; max: number; feedback: string }>;

const typeIcon = (t: string) => {
  switch (t) {
    case "mcq": return ListChecks;
    case "descriptive": return FileText;
    case "video": return Video;
    case "coding": return Code2;
    default: return ListChecks;
  }
};

const AttemptReviewDialog = ({ open, onOpenChange, attempt, assessmentTitle, passingScore, onSaved }: Props) => {
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [grading, setGrading] = useState<Grading>({});
  const [overrides, setOverrides] = useState<Record<string, string>>({}); // raw input strings
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [regrading, setRegrading] = useState(false);

  useEffect(() => {
    if (!open || !attempt) return;
    setLoading(true);
    supabase
      .from("assessment_questions")
      .select("*")
      .eq("assessment_id", attempt.assessment_id)
      .order("sort_order")
      .then(({ data }) => {
        const qs = (data || []).map((q: any) => ({
          ...q,
          options: Array.isArray(q.options) ? q.options : (typeof q.options === "string" ? JSON.parse(q.options) : []),
        })) as AssessmentQuestion[];
        setQuestions(qs);
        const g = (attempt.ai_grading as Grading) || {};
        setGrading(g);
        const ov: Record<string, string> = {};
        const fb: Record<string, string> = {};
        qs.forEach((q) => {
          ov[q.id] = String(g[q.id]?.score ?? "");
          fb[q.id] = g[q.id]?.feedback || "";
        });
        setOverrides(ov);
        setFeedback(fb);
        setLoading(false);
      });
  }, [open, attempt]);

  const totals = useMemo(() => {
    let earned = 0; let max = 0;
    questions.forEach((q) => {
      const m = q.max_score || 1;
      max += m;
      const raw = overrides[q.id];
      const s = raw === "" || raw === undefined ? (grading[q.id]?.score ?? 0) : Math.max(0, Math.min(m, Number(raw) || 0));
      earned += s;
    });
    const pct = max > 0 ? Math.round((earned / max) * 100) : 0;
    return { earned, max, pct };
  }, [questions, overrides, grading]);

  const passed = totals.pct >= passingScore;

  const handleSave = async () => {
    if (!attempt) return;
    setSaving(true);
    const newGrading: Grading = {};
    questions.forEach((q) => {
      const m = q.max_score || 1;
      const raw = overrides[q.id];
      const s = raw === "" || raw === undefined ? (grading[q.id]?.score ?? 0) : Math.max(0, Math.min(m, Number(raw) || 0));
      newGrading[q.id] = {
        score: s, max: m,
        feedback: feedback[q.id] || grading[q.id]?.feedback || "",
      };
    });
    let correctCount = 0;
    questions.forEach((q) => {
      const g = newGrading[q.id];
      if (g.score >= Math.ceil(g.max * 0.6)) correctCount += 1;
    });
    const { error } = await supabase
      .from("assessment_attempts")
      .update({
        ai_grading: newGrading,
        score: totals.pct,
        correct_answers: correctCount,
        grading_status: "graded",
      } as any)
      .eq("id", attempt.id);
    setSaving(false);
    if (error) {
      toast.error("Failed to save overrides");
      return;
    }
    toast.success("Scores updated");
    onSaved?.();
    onOpenChange(false);
  };

  const handleRegrade = async () => {
    if (!attempt) return;
    setRegrading(true);
    try {
      const { data, error } = await supabase.functions.invoke("grade-assessment-attempt", {
        body: { attempt_id: attempt.id },
      });
      if (error) throw error;
      const g = ((data as any)?.grading || {}) as Grading;
      setGrading(g);
      const ov: Record<string, string> = {};
      const fb: Record<string, string> = {};
      questions.forEach((q) => {
        ov[q.id] = String(g[q.id]?.score ?? "");
        fb[q.id] = g[q.id]?.feedback || "";
      });
      setOverrides(ov);
      setFeedback(fb);
      toast.success("Re-graded by AI");
    } catch (e) {
      toast.error("AI regrade failed");
    }
    setRegrading(false);
  };

  if (!attempt) return null;

  const responses: Record<string, any> = (attempt.responses as any) || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-warning" />
            Review: {attempt.student_name}
          </DialogTitle>
          <DialogDescription>
            {assessmentTitle} · Submitted {attempt.completed_at ? new Date(attempt.completed_at).toLocaleString() : "—"}
          </DialogDescription>
        </DialogHeader>

        {/* Score summary */}
        <div className="flex items-center gap-3 flex-wrap p-3 rounded-lg bg-muted/40 border border-border">
          <Badge variant="secondary" className="gap-1">
            <Trophy className="h-3 w-3" /> {totals.earned}/{totals.max} pts
          </Badge>
          <Badge className={passed ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}>
            {totals.pct}% · {passed ? "PASSED" : "FAILED"}
          </Badge>
          <span className="text-xs text-muted-foreground">Pass threshold: {passingScore}%</span>
          <Button
            size="sm" variant="outline" className="ml-auto gap-1.5"
            onClick={handleRegrade} disabled={regrading || loading}
          >
            {regrading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Re-grade with AI
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q, qi) => {
              const Icon = typeIcon(q.question_type);
              const r = responses[q.id] || {};
              const g = grading[q.id];
              const m = q.max_score || 1;
              return (
                <div key={q.id} className="border border-border rounded-lg p-4 space-y-3 bg-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="gap-1 capitalize text-[10px]">
                          <Icon className="h-3 w-3" /> {q.question_type}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">Max {m} pt</span>
                      </div>
                      <p className="text-sm font-medium text-card-foreground">{qi + 1}. {q.question}</p>
                    </div>
                  </div>

                  {/* Response */}
                  <div className="bg-muted/30 rounded p-3 text-sm">
                    {q.question_type === "mcq" && (
                      <div className="space-y-1.5">
                        {q.options.map((opt, oi) => {
                          const picked = typeof r.choice === "number" && r.choice === oi;
                          const isCorrect = q.correct === oi;
                          return (
                            <div key={oi} className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${
                              picked && isCorrect ? "bg-success/15 text-success" :
                              picked && !isCorrect ? "bg-destructive/15 text-destructive" :
                              isCorrect ? "bg-success/5 text-success" : "text-muted-foreground"
                            }`}>
                              {picked && isCorrect && <CheckCircle className="h-3 w-3" />}
                              {picked && !isCorrect && <XCircle className="h-3 w-3" />}
                              <span>{String.fromCharCode(65 + oi)}. {opt}</span>
                              {picked && <Badge variant="outline" className="ml-auto text-[10px]">Picked</Badge>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {q.question_type === "descriptive" && (
                      <p className="whitespace-pre-wrap text-card-foreground">{r.text || <em className="text-muted-foreground">No answer</em>}</p>
                    )}
                    {q.question_type === "coding" && (
                      <div className="space-y-2">
                        <div className="text-[10px] text-muted-foreground">Language: {q.language || "—"}</div>
                        <pre className="bg-background border border-border rounded p-2 text-[11px] font-mono max-h-48 overflow-auto whitespace-pre-wrap">{r.code || "(no code)"}</pre>
                        {r.stdout && (
                          <details>
                            <summary className="text-[11px] text-muted-foreground cursor-pointer">Run output</summary>
                            <pre className="bg-background border border-border rounded p-2 text-[11px] mt-1 max-h-32 overflow-auto whitespace-pre-wrap">{r.stdout}</pre>
                          </details>
                        )}
                      </div>
                    )}
                    {q.question_type === "video" && (
                      <div className="space-y-2">
                        {r.url ? (
                          <video src={r.url} controls className="w-full max-w-md rounded border border-border" />
                        ) : <em className="text-muted-foreground">No video uploaded</em>}
                        {r.transcript && (
                          <details>
                            <summary className="text-[11px] text-muted-foreground cursor-pointer">Transcript</summary>
                            <p className="text-xs mt-1 whitespace-pre-wrap">{r.transcript}</p>
                          </details>
                        )}
                      </div>
                    )}
                    {q.question_type !== "mcq" && q.expected_answer && (
                      <details className="mt-2">
                        <summary className="text-[11px] text-muted-foreground cursor-pointer">Expected answer / rubric</summary>
                        <p className="text-xs mt-1 whitespace-pre-wrap text-muted-foreground">{q.expected_answer}</p>
                      </details>
                    )}
                  </div>

                  {/* AI feedback + override */}
                  <div className="grid sm:grid-cols-[140px_1fr] gap-3 items-start">
                    <div>
                      <label className="text-[10px] uppercase text-muted-foreground font-medium">Score</label>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Input
                          type="number" min={0} max={m}
                          value={overrides[q.id] ?? ""}
                          onChange={(e) => setOverrides((p) => ({ ...p, [q.id]: e.target.value }))}
                          className="h-8 text-sm w-16"
                        />
                        <span className="text-xs text-muted-foreground">/ {m}</span>
                      </div>
                      {g && (
                        <p className="text-[10px] text-muted-foreground mt-1">AI: {g.score}/{g.max}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-muted-foreground font-medium">Feedback</label>
                      <Input
                        value={feedback[q.id] ?? ""}
                        onChange={(e) => setFeedback((p) => ({ ...p, [q.id]: e.target.value }))}
                        placeholder={g?.feedback || "Add a note for the student..."}
                        className="h-8 text-sm mt-1"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving || loading} className="gap-1.5 bg-gradient-primary border-0 text-primary-foreground">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Overrides
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AttemptReviewDialog;
