import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle, HelpCircle, Loader2 } from "lucide-react";
import type { Assessment, AssessmentAttempt } from "@/hooks/useAssessments";

interface QuestionData {
  id: string;
  question: string;
  options: string[];
  correct: number;
  sort_order: number;
}

interface Props {
  assessments: Assessment[];
  attempts: AssessmentAttempt[];
}

const QuestionLevelAnalytics = ({ assessments, attempts }: Props) => {
  const [selectedId, setSelectedId] = useState<string>("");
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [loading, setLoading] = useState(false);

  // Auto-select first assessment
  useEffect(() => {
    if (assessments.length > 0 && !selectedId) {
      setSelectedId(assessments[0].id);
    }
  }, [assessments, selectedId]);

  // Fetch questions for selected assessment
  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    supabase
      .from("assessment_questions")
      .select("id, question, options, correct, sort_order")
      .eq("assessment_id", selectedId)
      .order("sort_order")
      .then(({ data }) => {
        setQuestions(
          (data || []).map((q: any) => ({
            ...q,
            options: Array.isArray(q.options) ? q.options : JSON.parse(q.options),
          }))
        );
        setLoading(false);
      });
  }, [selectedId]);

  // Compute per-question stats from attempts
  const questionStats = useMemo(() => {
    if (!questions.length) return [];
    const relevantAttempts = attempts.filter(a => a.assessment_id === selectedId);
    
    return questions.map((q, idx) => {
      let correctCount = 0;
      let totalAnswered = 0;
      const optionCounts: Record<number, number> = {};

      relevantAttempts.forEach(attempt => {
        const answer = attempt.answers?.[q.id];
        if (answer !== undefined && answer !== null) {
          totalAnswered++;
          optionCounts[answer] = (optionCounts[answer] || 0) + 1;
          if (answer === q.correct) correctCount++;
        }
      });

      const correctRate = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
      
      // Find most common wrong answer
      let mostCommonWrong = -1;
      let mostCommonWrongCount = 0;
      Object.entries(optionCounts).forEach(([opt, count]) => {
        const optNum = Number(opt);
        if (optNum !== q.correct && count > mostCommonWrongCount) {
          mostCommonWrong = optNum;
          mostCommonWrongCount = count;
        }
      });

      return {
        ...q,
        questionNumber: idx + 1,
        correctRate,
        totalAnswered,
        correctCount,
        mostCommonWrong,
        mostCommonWrongCount,
        optionCounts,
      };
    });
  }, [questions, attempts, selectedId]);

  // Sort: hardest questions first
  const sorted = useMemo(() => [...questionStats].sort((a, b) => a.correctRate - b.correctRate), [questionStats]);

  if (assessments.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
        <HelpCircle className="h-6 w-6 mx-auto mb-2 text-muted-foreground/50" />
        No assessments available yet
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
        <h4 className="font-display font-semibold text-card-foreground flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-accent" /> Question-Level Analytics
        </h4>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select Assessment" />
          </SelectTrigger>
          <SelectContent>
            {assessments.map(a => (
              <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : sorted.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">No questions found</div>
      ) : (
        <div className="divide-y divide-border">
          {sorted.map(q => (
            <div key={q.id} className="p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  q.correctRate >= 70 ? "bg-success/10 text-success" : q.correctRate >= 40 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                }`}>
                  Q{q.questionNumber}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-card-foreground line-clamp-2">{q.question}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex-1 max-w-xs">
                      <Progress value={q.correctRate} className="h-2" />
                    </div>
                    <span className={`text-xs font-bold ${
                      q.correctRate >= 70 ? "text-success" : q.correctRate >= 40 ? "text-warning" : "text-destructive"
                    }`}>
                      {q.correctRate}% correct
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({q.correctCount}/{q.totalAnswered} students)
                    </span>
                  </div>
                  {q.totalAnswered > 0 && q.mostCommonWrong >= 0 && q.correctRate < 70 && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <AlertTriangle className="h-3 w-3 text-warning" />
                      Common wrong answer: <span className="font-medium text-card-foreground">"{q.options[q.mostCommonWrong]}"</span>
                      <span>({q.mostCommonWrongCount} students)</span>
                    </div>
                  )}
                  {q.correctRate >= 70 && q.totalAnswered > 0 && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-success">
                      <CheckCircle className="h-3 w-3" /> Well understood by students
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuestionLevelAnalytics;
