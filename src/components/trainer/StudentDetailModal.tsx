import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle } from "lucide-react";
import type { StudentData } from "@/hooks/useTrainerData";

interface Props {
  student: StudentData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StudentDetailModal({ student, open, onOpenChange }: Props) {
  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
              {student.name.split(" ").map(n => n[0]).join("")}
            </div>
            <div>
              <p className="text-lg font-display">{student.name}</p>
              <p className="text-sm text-muted-foreground font-normal">{student.college} • {student.location}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 my-4">
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-card-foreground">{student.progress}%</p>
            <p className="text-xs text-muted-foreground">Overall Progress</p>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-card-foreground">{student.modulesCompleted}/10</p>
            <p className="text-xs text-muted-foreground">Modules Done</p>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className={`text-2xl font-bold ${candidate.avgScore >= 80 ? "text-success" : candidate.avgScore >= 60 ? "text-warning" : "text-destructive"}`}>
              {student.avgScore}%
            </p>
            <p className="text-xs text-muted-foreground">Avg Score</p>
          </div>
        </div>

        <h4 className="font-display font-semibold text-card-foreground mb-3">Assessment Scores by Module</h4>
        {student.moduleScores.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assessments attempted yet.</p>
        ) : (
          <div className="space-y-3">
            {student.moduleScores
              .sort((a, b) => a.moduleId - b.moduleId)
              .map((ms) => (
                <div key={ms.moduleId} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  <span className="text-xs font-bold text-muted-foreground/50 font-display w-6">
                    {String(ms.moduleId).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-card-foreground truncate">{ms.moduleName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={ms.score} className="h-1.5 flex-1" />
                      <span className={`text-xs font-bold ${ms.score >= 80 ? "text-success" : ms.score >= 60 ? "text-warning" : "text-destructive"}`}>
                        {ms.score}%
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    {ms.correctAnswers}/{ms.totalQuestions}
                  </div>
                </div>
              ))}
          </div>
        )}

        <h4 className="font-display font-semibold text-card-foreground mt-6 mb-3">Module Progress</h4>
        <div className="grid grid-cols-2 gap-2">
          {student.moduleProgress
            .sort((a, b) => a.moduleId - b.moduleId)
            .map((mp) => (
              <div key={mp.moduleId} className="flex items-center gap-2 text-sm">
                {mp.completed ? (
                  <CheckCircle className="h-4 w-4 text-success shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                )}
                <span className={mp.completed ? "text-card-foreground" : "text-muted-foreground"}>
                  Module {mp.moduleId}
                </span>
                {!mp.completed && mp.progressPercent > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{mp.progressPercent}%</Badge>
                )}
              </div>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
