import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { mcqBank } from "@/data/videoContent";
import {
  Trophy, CheckCircle, XCircle, RotateCcw,
  ArrowRight, Clock, Sparkles, Target, ChevronRight,
} from "lucide-react";

interface ModuleQuizProps {
  moduleId: number;
  moduleName: string;
  onComplete?: (score: number, total: number) => void;
}

const ModuleQuiz = ({ moduleId, moduleName, onComplete }: ModuleQuizProps) => {
  const [retryKey, setRetryKey] = useState(0);

  const questions = useMemo(() => {
    const pool = mcqBank.filter((q) => q.moduleId === moduleId);
    // Fisher-Yates shuffle for a unique order each attempt
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [moduleId, retryKey]);

  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [started, setStarted] = useState(false);

  const question = questions[currentQ];
  const totalQuestions = questions.length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const handleSelect = (optionIndex: number) => {
    if (isAnswered) return;
    setSelectedAnswer(optionIndex);
  };

  const handleConfirm = () => {
    if (selectedAnswer === null) return;
    setIsAnswered(true);
    const isCorrect = selectedAnswer === question.correct;
    if (isCorrect) setCorrectCount((c) => c + 1);
    setAnsweredCount((c) => c + 1);
  };

  const handleNext = () => {
    if (currentQ < totalQuestions - 1) {
      setCurrentQ((c) => c + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      setShowResults(true);
      onComplete?.(correctCount + (selectedAnswer === question.correct ? 0 : 0), totalQuestions);
    }
  };

  const handleRetry = () => {
    setCurrentQ(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setCorrectCount(0);
    setAnsweredCount(0);
    setShowResults(false);
    setStarted(true);
  };

  if (totalQuestions === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No quiz questions available for this module yet.</p>
      </div>
    );
  }

  // Start screen
  if (!started) {
    return (
      <div className="max-w-lg mx-auto text-center py-8 space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Trophy className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h3 className="font-display font-bold text-xl text-card-foreground mb-2">
            {moduleName} — Module Quiz
          </h3>
          <p className="text-sm text-muted-foreground">
            Test your understanding of this module with {totalQuestions} questions. Answer each question to proceed to the next.
          </p>
        </div>
        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Target className="h-4 w-4 text-primary" /> {totalQuestions} Questions
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-warning" /> ~{totalQuestions * 1.5} min
          </span>
        </div>
        <Button
          onClick={() => setStarted(true)}
          className="bg-gradient-primary border-0 text-primary-foreground gap-2 px-8"
          size="lg"
        >
          <Sparkles className="h-4 w-4" /> Start Quiz
        </Button>
      </div>
    );
  }

  // Results screen
  if (showResults) {
    const scorePercent = Math.round((correctCount / totalQuestions) * 100);
    const passed = scorePercent >= 70;

    return (
      <div className="max-w-lg mx-auto text-center py-8 space-y-6">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${
          passed ? "bg-success/10" : "bg-warning/10"
        }`}>
          {passed ? (
            <Trophy className="h-10 w-10 text-success" />
          ) : (
            <Target className="h-10 w-10 text-warning" />
          )}
        </div>
        <div>
          <h3 className="font-display font-bold text-2xl text-card-foreground mb-1">
            {passed ? "Great Job!" : "Keep Practicing!"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {passed
              ? "You've demonstrated a strong understanding of this module."
              : "Review the lessons and try again to improve your score."}
          </p>
        </div>

        <div className="bg-muted/50 rounded-xl p-6 space-y-4">
          <div className="text-4xl font-display font-bold text-primary">
            {scorePercent}%
          </div>
          <Progress value={scorePercent} className="h-2.5" />
          <div className="flex justify-center gap-8 text-sm">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-card-foreground font-medium">{correctCount} Correct</span>
            </div>
            <div className="flex items-center gap-1.5">
              <XCircle className="h-4 w-4 text-destructive" />
              <span className="text-card-foreground font-medium">{totalQuestions - correctCount} Wrong</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" onClick={handleRetry} className="gap-2">
            <RotateCcw className="h-4 w-4" /> Retry Quiz
          </Button>
        </div>
      </div>
    );
  }

  // Question screen
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Question {currentQ + 1} of {totalQuestions}</span>
          <span>{progressPercent}% complete</span>
        </div>
        <Progress value={progressPercent} className="h-1.5" />
      </div>

      {/* Question card */}
      <div className="bg-muted/30 rounded-xl p-6 border border-border">
        <p className="font-display font-semibold text-card-foreground text-base mb-5">
          {question.question}
        </p>

        <div className="space-y-2.5">
          {question.options.map((opt, oi) => {
            let style = "border-border text-card-foreground hover:border-primary/40 hover:bg-primary/5";

            if (isAnswered) {
              if (oi === question.correct) {
                style = "border-success bg-success/10 text-success font-medium";
              } else if (oi === selectedAnswer) {
                style = "border-destructive bg-destructive/10 text-destructive";
              } else {
                style = "border-border text-muted-foreground opacity-60";
              }
            } else if (selectedAnswer === oi) {
              style = "border-primary bg-primary/5 text-primary ring-1 ring-primary/20";
            }

            return (
              <button
                key={oi}
                onClick={() => handleSelect(oi)}
                disabled={isAnswered}
                className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all flex items-center gap-3 ${style}`}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  isAnswered && oi === question.correct
                    ? "bg-success text-success-foreground"
                    : isAnswered && oi === selectedAnswer
                    ? "bg-destructive text-destructive-foreground"
                    : selectedAnswer === oi
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {isAnswered && oi === question.correct ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : isAnswered && oi === selectedAnswer ? (
                    <XCircle className="h-4 w-4" />
                  ) : (
                    String.fromCharCode(65 + oi)
                  )}
                </span>
                {opt}
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {isAnswered && (
          <div className={`mt-4 p-3.5 rounded-lg text-sm flex items-start gap-2.5 ${
            selectedAnswer === question.correct
              ? "bg-success/10 border border-success/20"
              : "bg-warning/10 border border-warning/20"
          }`}>
            <Sparkles className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
              selectedAnswer === question.correct ? "text-success" : "text-warning"
            }`} />
            <p className="text-muted-foreground">{question.explanation}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {correctCount} correct so far
        </span>
        {!isAnswered ? (
          <Button
            onClick={handleConfirm}
            disabled={selectedAnswer === null}
            className="bg-gradient-primary border-0 text-primary-foreground gap-2"
          >
            Confirm Answer
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            className="bg-gradient-primary border-0 text-primary-foreground gap-2"
          >
            {currentQ < totalQuestions - 1 ? (
              <>Next Question <ChevronRight className="h-4 w-4" /></>
            ) : (
              <>View Results <ArrowRight className="h-4 w-4" /></>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default ModuleQuiz;
