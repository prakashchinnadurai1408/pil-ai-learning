import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  ClipboardCheck, Clock, Trophy, ArrowRight, Loader2, Timer, AlertTriangle, CheckCircle, XCircle, Shield
} from "lucide-react";
import {
  useAssessments,
  useAssessmentQuestions,
  useAssessmentAttempts,
  submitAssessmentAttempt,
  type Assessment,
} from "@/hooks/useAssessments";
import ProctoringMonitor from "./ProctoringMonitor";

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const TakeAssessment = ({
  assessment,
  onBack,
  studentId,
  studentName,
  studentCollege,
}: {
  assessment: Assessment;
  onBack: () => void;
  studentId: string;
  studentName: string;
  studentCollege: string;
}) => {
  const { questions, loading } = useAssessmentQuestions(assessment.id);
  const { attempts, refetch: refetchAttempts } = useAssessmentAttempts(assessment.id);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [attemptId] = useState(() => crypto.randomUUID());
  const isProctoringEnabled = assessment.proctoring_enabled;

  const myAttempts = useMemo(() =>
    attempts.filter(a => a.student_name === studentName),
    [attempts, studentName]
  );
  const canAttempt = !assessment.max_attempts || myAttempts.length < assessment.max_attempts;

  useEffect(() => {
    if (!started || !assessment.time_limit_minutes || submitted) return;
    setTimeLeft(assessment.time_limit_minutes * 60);
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [started, submitted]);

  const handleStart = () => {
    setStarted(true);
    setStartTime(Date.now());
    setAnswers({});
    setSubmitted(false);
  };

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    const correctCount = questions.filter((q, i) => answers[i] === q.correct).length;
    const score = Math.round((correctCount / questions.length) * 100);
    const timeTaken = Math.round((Date.now() - startTime) / 1000);

    await submitAssessmentAttempt({
      assessment_id: assessment.id,
      student_id: studentId,
      student_name: studentName,
      student_college: studentCollege,
      score,
      total_questions: questions.length,
      correct_answers: correctCount,
      time_taken_seconds: timeTaken,
      answers: Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, v])),
    });

    // Save proctoring summary if enabled
    if (isProctoringEnabled && (window as any).__proctoringEndSession) {
      await (window as any).__proctoringEndSession();
    }

    setSubmitted(true);
    setSubmitting(false);
    refetchAttempts();
  }, [answers, questions, assessment.id, studentId, studentName, studentCollege, startTime, submitting, isProctoringEnabled]);

  const score = useMemo(
    () => questions.filter((q, i) => answers[i] === q.correct).length,
    [questions, answers]
  );
  const scorePercent = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
  const passed = scorePercent >= assessment.passing_score;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!started) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-lg text-foreground">{assessment.title}</h3>
          <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
        </div>
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          {assessment.description && <p className="text-sm text-muted-foreground">{assessment.description}</p>}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="bg-muted rounded-lg p-3">
              <p className="text-lg font-bold text-foreground">{assessment.question_count}</p>
              <p className="text-xs text-muted-foreground">Questions</p>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-lg font-bold text-foreground">{assessment.time_limit_minutes || "∞"}</p>
              <p className="text-xs text-muted-foreground">Minutes</p>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-lg font-bold text-foreground">{assessment.passing_score}%</p>
              <p className="text-xs text-muted-foreground">Pass Score</p>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <p className="text-lg font-bold text-foreground">{myAttempts.length}/{assessment.max_attempts || "∞"}</p>
              <p className="text-xs text-muted-foreground">Attempts</p>
            </div>
          </div>

          {myAttempts.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Previous Attempts</h4>
              <div className="space-y-2">
                {myAttempts.map((a, i) => (
                  <div key={a.id} className="flex items-center justify-between bg-muted/50 rounded-lg p-3 text-sm">
                    <span>Attempt #{i + 1}</span>
                    <span className={a.score >= assessment.passing_score ? "text-success font-medium" : "text-destructive font-medium"}>
                      {a.score}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isProctoringEnabled && (
            <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm text-primary">
              <Shield className="h-4 w-4" />
              <div>
                <p className="font-medium">Proctoring Enabled</p>
                <p className="text-xs text-muted-foreground">Camera, fullscreen, tab monitoring & face detection will be active</p>
              </div>
            </div>
          )}

          <Button
            onClick={handleStart}
            disabled={!canAttempt}
            className="w-full bg-gradient-primary border-0 text-primary-foreground gap-2"
            size="lg"
          >
            {canAttempt ? (
              <><ArrowRight className="h-4 w-4" /> Start Assessment</>
            ) : (
              <><AlertTriangle className="h-4 w-4" /> Max attempts reached</>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with timer */}
      <div className="flex items-center justify-between sticky top-16 z-40 bg-background py-3">
        <div>
          <h3 className="font-display font-semibold text-foreground">{assessment.title}</h3>
          <p className="text-xs text-muted-foreground">
            {Object.keys(answers).length}/{questions.length} answered
          </p>
        </div>
        <div className="flex items-center gap-3">
          {timeLeft !== null && (
            <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-mono font-bold ${timeLeft < 60 ? "bg-destructive/10 text-destructive animate-pulse" : "bg-muted text-foreground"}`}>
              <Timer className="h-4 w-4" />
              {formatTime(timeLeft)}
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={onBack}>← Exit</Button>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
        {questions.map((q, qi) => (
          <div key={q.id} className="bg-card rounded-lg border border-border p-5 shadow-card">
            <p className="font-medium mb-3 text-card-foreground text-sm">{qi + 1}. {q.question}</p>
            <div className="space-y-2">
              {q.options.map((opt, oi) => (
                <button
                  key={oi}
                  onClick={() => !submitted && setAnswers({ ...answers, [qi]: oi })}
                  disabled={submitted}
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
                  {submitted && oi === q.correct && <CheckCircle className="h-3 w-3 inline mr-1" />}
                  {submitted && answers[qi] === oi && oi !== q.correct && <XCircle className="h-3 w-3 inline mr-1" />}
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

      {/* Submit / Results */}
      <div className="flex items-center gap-4 pt-4 border-t border-border">
        {!submitted ? (
          <Button
            onClick={handleSubmit}
            disabled={submitting || Object.keys(answers).length < questions.length}
            className="bg-gradient-primary border-0 text-primary-foreground gap-2"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
            Submit Assessment
          </Button>
        ) : (
          <div className="flex items-center gap-4 w-full">
            <div className="flex items-center gap-2">
              <Trophy className={`h-5 w-5 ${passed ? "text-warning" : "text-destructive"}`} />
              <p className="font-display font-bold text-foreground">
                {scorePercent}% ({score}/{questions.length})
              </p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${passed ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                {passed ? "PASSED" : "FAILED"}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={onBack} className="ml-auto">
              Back to Assessments
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

const StudentAssessmentTaker = () => {
  const { assessments, loading } = useAssessments("published");
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const studentName = sessionStorage.getItem("studentName") || "Student";
  const studentId = sessionStorage.getItem("studentId") || "";
  const studentCollege = sessionStorage.getItem("studentCollege") || "";

  // Filter assessments by college assignment
  const visibleAssessments = useMemo(() =>
    assessments.filter(a =>
      a.assigned_colleges.length === 0 || a.assigned_colleges.includes(studentCollege)
    ),
    [assessments, studentCollege]
  );

  if (selectedAssessment) {
    return (
      <TakeAssessment
        assessment={selectedAssessment}
        onBack={() => setSelectedAssessment(null)}
        studentId={studentId}
        studentName={studentName}
        studentCollege={studentCollege}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-display font-bold text-foreground">Assessments</h3>
        <p className="text-sm text-muted-foreground">{visibleAssessments.length} assessments available</p>
      </div>

      {visibleAssessments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No assessments assigned to you yet</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleAssessments.map(a => (
            <div key={a.id} className="bg-card border border-border rounded-lg p-5 shadow-card hover:shadow-elevated transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                </div>
              </div>
              <h4 className="font-display font-semibold text-card-foreground mb-1">{a.title}</h4>
              {a.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{a.description}</p>}
              <div className="text-xs text-muted-foreground space-y-0.5 mb-4">
                <p>{a.question_count} questions · Pass: {a.passing_score}%</p>
                {a.time_limit_minutes && <p>⏱️ {a.time_limit_minutes} min</p>}
                {a.max_attempts && <p>🔄 Max {a.max_attempts} attempts</p>}
              </div>
              <Button
                onClick={() => setSelectedAssessment(a)}
                className="w-full bg-gradient-primary border-0 text-primary-foreground gap-2"
                size="sm"
              >
                Take Assessment <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentAssessmentTaker;
