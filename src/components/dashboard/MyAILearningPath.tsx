import { useCandidateLearningPath } from "@/hooks/useCandidateLearningPath";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Route, RefreshCw, ArrowRight, Wand2, CheckCircle2, Brain, Circle } from "lucide-react";
import { toast } from "sonner";
import DiagnosticAssessmentDialog from "./DiagnosticAssessmentDialog";

interface Props {
  candidateId: string | null;
  onOpenModule?: (moduleId: number) => void;
}

interface ModuleProgressMap {
  [moduleId: number]: { progress_percent: number; completed: boolean };
}

const MyAILearningPath = ({ candidateId, onOpenModule }: Props) => {
  const { path, loading, generating, generate } = useCandidateLearningPath(candidateId);
  const [diagOpen, setDiagOpen] = useState(false);
  const [progressMap, setProgressMap] = useState<ModuleProgressMap>({});
  const [candidateName, setCandidateName] = useState("");

  useEffect(() => {
    if (!candidateId) return;
    supabase
      .from("students")
      .select("name")
      .eq("id", candidateId)
      .maybeSingle()
      .then(({ data }) => setCandidateName((data as any)?.name || ""));

    supabase
      .from("student_module_progress")
      .select("module_id, progress_percent, completed")
      .eq("student_id", candidateId)
      .then(({ data }) => {
        const map: ModuleProgressMap = {};
        (data || []).forEach((r: any) => {
          map[r.module_id] = { progress_percent: r.progress_percent || 0, completed: !!r.completed };
        });
        setProgressMap(map);
      });
  }, [candidateId, path?.id]);

  const generateWithDiagnostic = async (diagnostic?: any) => {
    try {
      const res = await generate(diagnostic);
      if (res?.beginnerDefault) {
        toast.success("Beginner path created — start with Module 1!");
      } else {
        toast.success(diagnostic ? "Path generated from your diagnostic results!" : "Your personalized AI learning path is ready");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to generate path");
    }
  };

  const handleStartDiagnostic = () => setDiagOpen(true);
  const handleSkipDiagnostic = () => generateWithDiagnostic();

  if (loading) {
    return <div className="h-32 bg-muted/30 rounded-lg animate-pulse" />;
  }

  if (!path) {
    return (
      <>
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="py-6 text-center">
            <Wand2 className="h-10 w-10 mx-auto mb-3 text-primary" />
            <h3 className="font-display font-semibold text-lg text-card-foreground mb-1">
              Get Your AI-Powered Learning Path
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Prakash can analyze your activity to recommend the best modules. New here? Take a 10-question
              diagnostic so we can tailor it to your level.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button onClick={handleStartDiagnostic} disabled={generating} className="gap-2">
                <Brain className="h-4 w-4" />
                Take Diagnostic & Generate
              </Button>
              <Button onClick={handleSkipDiagnostic} disabled={generating} variant="outline" className="gap-2">
                {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {generating ? "Generating…" : "Skip — Generate Default"}
              </Button>
            </div>
          </CardContent>
        </Card>
        {candidateId && (
          <DiagnosticAssessmentDialog
            open={diagOpen}
            onOpenChange={setDiagOpen}
            candidateId={candidateId}
            candidateName={candidateName}
            onComplete={(diag) => generateWithDiagnostic(diag)}
          />
        )}
      </>
    );
  }

  // Compute path progress
  const totalModules = path.modules.length;
  const completedCount = path.modules.filter((m) => progressMap[m.module_id]?.completed).length;
  const inProgressCount = path.modules.filter(
    (m) => !progressMap[m.module_id]?.completed && (progressMap[m.module_id]?.progress_percent || 0) > 0
  ).length;
  const pctComplete = totalModules ? Math.round((completedCount / totalModules) * 100) : 0;
  const nextRecommendedIndex = path.modules.findIndex((m) => !progressMap[m.module_id]?.completed);

  return (
    <>
      <Card className="border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                <Route className="h-5 w-5 text-primary" />
                {path.title}
                {path.is_beginner_default ? (
                  <Badge variant="outline" className="text-xs">Beginner Track</Badge>
                ) : (
                  <Badge className="text-xs gap-1"><Sparkles className="h-3 w-3" /> AI Personalized</Badge>
                )}
              </CardTitle>
              {path.rationale && (
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{path.rationale}</p>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={() => generateWithDiagnostic()} disabled={generating} className="gap-1.5 shrink-0">
              <RefreshCw className={`h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`} />
              {generating ? "…" : "Regenerate"}
            </Button>
          </div>

          {/* Path Progress Bar */}
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                <span className="font-semibold text-foreground">{completedCount}</span> of {totalModules} completed
                {inProgressCount > 0 && <span className="ml-2 text-primary">· {inProgressCount} in progress</span>}
              </span>
              <span className="font-semibold text-primary">{pctComplete}%</span>
            </div>
            <Progress value={pctComplete} className="h-2" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {path.modules.map((m, i) => {
            const prog = progressMap[m.module_id];
            const isCompleted = !!prog?.completed;
            const isInProgress = !isCompleted && (prog?.progress_percent || 0) > 0;
            const isNext = i === nextRecommendedIndex;

            return (
              <button
                key={m.id}
                onClick={() => onOpenModule?.(m.module_id)}
                className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border transition-colors group ${
                  isNext
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : isCompleted
                    ? "border-border bg-muted/20 opacity-80"
                    : "border-border hover:border-primary/50 hover:bg-muted/30"
                }`}
              >
                <div className="shrink-0 mt-0.5">
                  {isCompleted ? (
                    <CheckCircle2 className="h-7 w-7 text-success" />
                  ) : isNext ? (
                    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold ring-2 ring-primary/30">
                      {i + 1}
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                      {i + 1}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className={`font-medium text-sm ${isCompleted ? "text-muted-foreground line-through" : "text-card-foreground"}`}>
                      {m.module_title}
                    </div>
                    {isNext && <Badge className="text-[10px] py-0 px-1.5 h-4">Next Up</Badge>}
                    {isCompleted && <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 text-success border-success/40">Done</Badge>}
                    {isInProgress && (
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">{prog?.progress_percent}%</Badge>
                    )}
                  </div>
                  {m.reason && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{m.reason}</div>}
                  {isInProgress && (
                    <Progress value={prog?.progress_percent || 0} className="h-1 mt-1.5" />
                  )}
                </div>
                <ArrowRight className={`h-4 w-4 transition-colors mt-1 shrink-0 ${isNext ? "text-primary" : "text-muted-foreground group-hover:text-primary"}`} />
              </button>
            );
          })}
        </CardContent>
      </Card>

      {candidateId && (
        <DiagnosticAssessmentDialog
          open={diagOpen}
          onOpenChange={setDiagOpen}
          candidateId={candidateId}
          candidateName={candidateName}
          onComplete={(diag) => generateWithDiagnostic(diag)}
        />
      )}
    </>
  );
};

export default MyAILearningPath;
