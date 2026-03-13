import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mcqBank, moduleNames } from "@/data/videoContent";
import { ClipboardCheck, Clock, Trophy, ArrowRight, Filter, CheckCircle, RotateCcw, Sparkles } from "lucide-react";
import { usePublishedSectionContent } from "@/hooks/useAdminSectionContent";

const AssessmentsView = () => {
  const { items: adminAssessments } = usePublishedSectionContent("assessments");
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [shuffleKey, setShuffleKey] = useState(0);

  const questions = useMemo(() => {
    if (!selectedModule) return [];
    const pool = mcqBank.filter((q) => q.moduleId === Number(selectedModule));
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [selectedModule, shuffleKey]);

  const score = useMemo(
    () => questions.filter((q, i) => answers[i] === q.correct).length,
    [questions, answers, submitted]
  );

  const assessmentList = Object.entries(moduleNames).map(([id, name]) => {
    const qCount = mcqBank.filter((q) => q.moduleId === Number(id)).length;
    return { id: Number(id), name, questions: qCount, duration: `${qCount * 2} min` };
  });

  if (selectedModule) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-lg text-foreground">
              {moduleNames[Number(selectedModule)]} — Assessment
            </h3>
            <p className="text-xs text-muted-foreground">{questions.length} questions</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setSelectedModule(null); setAnswers({}); setSubmitted(false); }} className="text-muted-foreground">
            ← All Assessments
          </Button>
        </div>

        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
          {questions.map((q, qi) => (
            <div key={q.id} className="bg-card rounded-lg border border-border p-5 shadow-card">
              <p className="font-medium mb-3 text-card-foreground text-sm">{qi + 1}. {q.question}</p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => (
                  <button
                    key={oi}
                    onClick={() => !submitted && setAnswers({ ...answers, [qi]: oi })}
                    className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-colors ${
                      submitted
                        ? oi === q.correct
                          ? "border-success bg-success/10 text-success font-medium"
                          : answers[qi] === oi
                          ? "border-destructive bg-destructive/10 text-destructive"
                          : "border-border text-muted-foreground"
                        : answers[qi] === oi
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {String.fromCharCode(65 + oi)}. {opt}
                  </button>
                ))}
              </div>
              {submitted && (
                <p className="text-xs text-muted-foreground mt-2 italic">💡 {q.explanation}</p>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 pt-4 border-t border-border">
          {!submitted ? (
            <>
              <Button
                onClick={() => setSubmitted(true)}
                disabled={Object.keys(answers).length < questions.length}
                className="bg-gradient-primary border-0 text-primary-foreground"
              >
                Submit Assessment
              </Button>
              <span className="text-xs text-muted-foreground">
                {Object.keys(answers).length}/{questions.length} answered
              </span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-warning" />
                <p className="font-display font-bold text-foreground">
                  Score: {score}/{questions.length} ({Math.round((score / questions.length) * 100)}%)
                </p>
              </div>
              <Button variant="outline" size="sm" className="gap-1" onClick={() => { setAnswers({}); setSubmitted(false); setShuffleKey((k) => k + 1); }}>
                <RotateCcw className="h-3 w-3" /> Retry
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: "Total Assessments", value: "10", icon: ClipboardCheck, color: "text-primary" },
          { label: "Total Questions", value: String(mcqBank.length), icon: Trophy, color: "text-warning" },
          { label: "Avg Duration", value: "~15 min", icon: Clock, color: "text-success" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-card rounded-lg border border-border p-5 shadow-card flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${stat.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-display font-bold text-card-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Assessment Cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        {assessmentList.map((a) => (
          <div key={a.id} className="bg-card rounded-lg border border-border p-5 shadow-card hover:shadow-elevated transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ClipboardCheck className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground font-display font-bold">
                Module {String(a.id).padStart(2, "0")}
              </span>
            </div>
            <h4 className="font-display font-semibold text-card-foreground mb-1">{a.name}</h4>
            <p className="text-xs text-muted-foreground mb-4">
              {a.questions} questions · ~{a.duration}
            </p>
            <Button
              onClick={() => setSelectedModule(String(a.id))}
              className="w-full bg-gradient-primary border-0 text-primary-foreground gap-2"
              size="sm"
            >
              Start Assessment <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AssessmentsView;
