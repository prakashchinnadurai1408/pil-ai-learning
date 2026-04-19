import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Gauge } from "lucide-react";
import type { QuestionDraft } from "./TypedQuestionEditor";

interface Props {
  questions: QuestionDraft[];
  difficulty: "easy" | "medium" | "hard";
  plannedMix?: { mcq: number; descriptive: number; video: number; coding: number };
}

const TYPE_META: Record<string, { label: string; cls: string }> = {
  mcq: { label: "MCQ", cls: "bg-primary" },
  descriptive: { label: "Descriptive", cls: "bg-accent" },
  video: { label: "Video", cls: "bg-success" },
  coding: { label: "Coding", cls: "bg-warning" },
};

const DIFFICULTY_META: Record<string, { label: string; pct: number; cls: string }> = {
  easy: { label: "Easy", pct: 33, cls: "bg-success" },
  medium: { label: "Medium", pct: 66, cls: "bg-warning" },
  hard: { label: "Hard", pct: 100, cls: "bg-destructive" },
};

const AssessmentMixPreview = ({ questions, difficulty, plannedMix }: Props) => {
  const valid = questions.filter(q => q.question.trim());
  const counts = valid.reduce(
    (acc, q) => {
      const key = q.question_type || "mcq";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    },
    { mcq: 0, descriptive: 0, video: 0, coding: 0 } as Record<string, number>,
  );
  const total = valid.length;
  const totalScore = valid.reduce((s, q) => s + (q.max_score || 0), 0);
  const diff = DIFFICULTY_META[difficulty] || DIFFICULTY_META.medium;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="h-4 w-4" /> Review — Question Mix & Difficulty
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {total === 0 ? (
          <p className="text-xs text-muted-foreground">Add questions to see the preview.</p>
        ) : (
          <>
            {/* Stacked bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-foreground">Type distribution</span>
                <span className="text-xs text-muted-foreground">{total} questions · {totalScore} pts</span>
              </div>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                {(["mcq", "descriptive", "video", "coding"] as const).map(t => {
                  const pct = total ? (counts[t] / total) * 100 : 0;
                  if (!pct) return null;
                  return (
                    <div
                      key={t}
                      className={TYPE_META[t].cls}
                      style={{ width: `${pct}%` }}
                      title={`${TYPE_META[t].label}: ${counts[t]} (${pct.toFixed(0)}%)`}
                    />
                  );
                })}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                {(["mcq", "descriptive", "video", "coding"] as const).map(t => (
                  <div key={t} className="flex items-center gap-2 text-xs">
                    <span className={`h-2.5 w-2.5 rounded-sm ${TYPE_META[t].cls}`} />
                    <span className="text-muted-foreground">{TYPE_META[t].label}</span>
                    <span className="ml-auto font-medium text-foreground">
                      {counts[t]}
                      {plannedMix && plannedMix[t] !== counts[t] && (
                        <span className="text-muted-foreground"> / {plannedMix[t]}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Difficulty gauge */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Gauge className="h-3.5 w-3.5" /> AI Difficulty
                </span>
                <span className="text-xs text-muted-foreground">{diff.label}</span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className={`h-full ${diff.cls} transition-all`} style={{ width: `${diff.pct}%` }} />
              </div>
              <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
                <span>Easy</span><span>Medium</span><span>Hard</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Difficulty applies to AI-generated questions. Manual & bank questions keep their own complexity.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AssessmentMixPreview;
