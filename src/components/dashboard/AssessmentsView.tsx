import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { mcqBank, moduleNames } from "@/data/videoContent";
import { useQuizQuestions } from "@/hooks/useQuizQuestions";
import { usePublishedSectionContent } from "@/hooks/useAdminSectionContent";
import { ClipboardCheck, Clock, Trophy, ArrowRight, RotateCcw, Sparkles, Loader2 } from "lucide-react";

const AssessmentQuiz = ({ moduleId, moduleName, onBack }: { moduleId: number; moduleName: string; onBack: () => void }) => {
  const { questions, loading, loadQuestions, attemptCount } = useQuizQuestions(moduleId, moduleName);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [started, setStarted] = useState(false);

  const score = useMemo(
    () => questions.filter((q, i) => answers[i] === q.correct).length,
    [questions, answers, submitted]
  );

  const handleStart = async () => {
    setAnswers({});
    setSubmitted(false);
    await loadQuestions(false);
    setStarted(true);
  };

  const handleRetake = async () => {
    setAnswers({});
    setSubmitted(false);
    await loadQuestions(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          {attemptCount > 0 ? "Generating fresh AI questions..." : "Loading questions..."}
        </p>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-lg text-foreground">{moduleName} — Assessment</h3>
          <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">← All Assessments</Button>
        </div>
        <div className="text-center py-8">
          <Button onClick={handleStart} className="bg-gradient-primary border-0 text-primary-foreground gap-2" size="lg">
            <Sparkles className="h-4 w-4" /> Start Assessment
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-semibold text-lg text-foreground">{moduleName} — Assessment</h3>
          <p className="text-xs text-muted-foreground">{questions.length} questions · Attempt #{attemptCount}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">← All Assessments</Button>
      </div>

      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
        {questions.map((q, qi) => (
          <div key={qi} className="bg-card rounded-lg border border-border p-5 shadow-card">
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
            <Button variant="outline" size="sm" className="gap-1" onClick={handleRetake}>
              <RotateCcw className="h-3 w-3" /> Retake with New Questions
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

const AdminAssessmentQuiz = ({ assessment, onBack }: { assessment: any; onBack: () => void }) => {
  const questions: { question: string; options: string[]; correct: number; explanation: string }[] =
    Array.isArray(assessment.content) ? assessment.content : [];
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [attemptCount, setAttemptCount] = useState(1);

  const handleRetake = () => {
    setAnswers({});
    setSubmitted(false);
    setAttemptCount(c => c + 1);
  };

  const score = useMemo(
    () => questions.filter((q, i) => answers[i] === q.correct).length,
    [questions, answers, submitted]
  );

  if (questions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-lg text-foreground">{assessment.title}</h3>
          <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">← All Assessments</Button>
        </div>
        <p className="text-muted-foreground text-center py-8">No questions available for this assessment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-semibold text-lg text-foreground">{assessment.title}</h3>
          <p className="text-xs text-muted-foreground">{questions.length} questions · ~{Math.max(10, questions.length)} min</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">← All Assessments</Button>
      </div>

      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
        {questions.map((q, qi) => (
          <div key={qi} className="bg-card rounded-lg border border-border p-5 shadow-card">
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
            {submitted && q.explanation && (
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
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-warning" />
            <p className="font-display font-bold text-foreground">
              Score: {score}/{questions.length} ({Math.round((score / questions.length) * 100)}%)
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const AssessmentsView = () => {
  const { items: adminAssessments } = usePublishedSectionContent("assessments");
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  const assessmentList = Object.entries(moduleNames).map(([id, name]) => {
    const qCount = mcqBank.filter((q) => q.moduleId === Number(id)).length;
    return { id: Number(id), name, questions: qCount, duration: `${qCount * 2} min` };
  });

  if (selectedModule) {
    // Handle admin-published assessments
    if (selectedModule.startsWith("admin-")) {
      const adminId = selectedModule.replace("admin-", "");
      const adminItem = adminAssessments.find(a => a.id === adminId);
      if (adminItem) {
        return (
          <AdminAssessmentQuiz
            assessment={adminItem}
            onBack={() => setSelectedModule(null)}
          />
        );
      }
    }
    return (
      <AssessmentQuiz
        moduleId={Number(selectedModule)}
        moduleName={moduleNames[Number(selectedModule)]}
        onBack={() => setSelectedModule(null)}
      />
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

      {/* Admin-published assessments */}
      {adminAssessments.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-accent" />
            <h4 className="font-display font-semibold text-card-foreground">Additional Assessments</h4>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {adminAssessments.map(item => {
              const qCount = Array.isArray(item.content) ? item.content.length : 0;
              return (
                <div key={item.id} className="bg-card rounded-lg border border-accent/20 p-5 shadow-card hover:shadow-elevated transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <ClipboardCheck className="h-5 w-5 text-accent" />
                    </div>
                    <span className="text-xs text-muted-foreground font-display font-bold">Additional</span>
                  </div>
                  <h5 className="font-display font-semibold text-card-foreground mb-1">{item.title}</h5>
                  <p className="text-xs text-muted-foreground mb-4">
                    {qCount > 0 ? `${qCount} questions` : "8-10 questions"} · ~10 min
                  </p>
                  <Button
                    onClick={() => setSelectedModule(`admin-${item.id}`)}
                    className="w-full bg-gradient-primary border-0 text-primary-foreground gap-2"
                    size="sm"
                  >
                    Start Assessment <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentsView;
