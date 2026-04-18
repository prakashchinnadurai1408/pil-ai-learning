import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import type { QuestionType } from "@/hooks/useAssessments";

export interface QuestionDraft {
  question: string;
  options: string[];
  correct: number | null;
  explanation: string;
  source: string;
  question_type: QuestionType;
  expected_answer: string;
  max_score: number;
  time_limit_seconds: number | null;
  starter_code: string;
  language: string;
}

export const emptyQuestion = (type: QuestionType = "mcq"): QuestionDraft => ({
  question: "",
  options: type === "mcq" ? ["", "", "", ""] : [],
  correct: type === "mcq" ? 0 : null,
  explanation: "",
  source: "manual",
  question_type: type,
  expected_answer: "",
  max_score: type === "mcq" ? 1 : type === "coding" ? 10 : 5,
  time_limit_seconds: type === "video" ? 120 : null,
  starter_code: "",
  language: type === "coding" ? "python" : "",
});

const TYPE_LABEL: Record<QuestionType, string> = {
  mcq: "MCQ", descriptive: "Descriptive", video: "Video", coding: "Coding",
};

interface Props {
  index: number;
  question: QuestionDraft;
  onChange: (next: QuestionDraft) => void;
  onRemove: () => void;
  canRemove: boolean;
}

const TypedQuestionEditor = ({ index, question, onChange, onRemove, canRemove }: Props) => {
  const update = <K extends keyof QuestionDraft>(field: K, value: QuestionDraft[K]) => {
    onChange({ ...question, [field]: value });
  };

  const updateOption = (oIdx: number, value: string) => {
    const opts = [...question.options];
    opts[oIdx] = value;
    update("options", opts);
  };

  const changeType = (newType: QuestionType) => {
    // Reshape draft when type changes, preserving question text
    onChange({
      ...emptyQuestion(newType),
      question: question.question,
      explanation: question.explanation,
      source: question.source,
    });
  };

  return (
    <div className="border border-border rounded-lg p-4 space-y-3 bg-card">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground">Q{index + 1}</span>
          <span className="text-[10px] uppercase tracking-wide bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
            {TYPE_LABEL[question.question_type]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Select value={question.question_type} onValueChange={(v) => changeType(v as QuestionType)}>
            <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mcq">MCQ</SelectItem>
              <SelectItem value="descriptive">Descriptive</SelectItem>
              <SelectItem value="video">Video answer</SelectItem>
              <SelectItem value="coding">Coding</SelectItem>
            </SelectContent>
          </Select>
          {canRemove && (
            <Button variant="ghost" size="sm" onClick={onRemove}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          )}
        </div>
      </div>

      <Textarea
        placeholder="Question text..."
        value={question.question}
        onChange={(e) => update("question", e.target.value)}
        rows={2}
      />

      {question.question_type === "mcq" && (
        <>
          <div className="grid grid-cols-2 gap-2">
            {question.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${index}`}
                  checked={question.correct === oi}
                  onChange={() => update("correct", oi)}
                  className="accent-primary"
                />
                <Input
                  placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                  value={opt}
                  onChange={(e) => updateOption(oi, e.target.value)}
                  className="flex-1"
                />
              </div>
            ))}
          </div>
          <Input
            placeholder="Explanation (shown after answering)"
            value={question.explanation}
            onChange={(e) => update("explanation", e.target.value)}
          />
        </>
      )}

      {question.question_type === "descriptive" && (
        <>
          <Textarea
            placeholder="Expected answer / rubric (used by AI for grading)"
            value={question.expected_answer}
            onChange={(e) => update("expected_answer", e.target.value)}
            rows={3}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Max score</Label>
              <Input
                type="number"
                value={question.max_score}
                onChange={(e) => update("max_score", Number(e.target.value) || 1)}
              />
            </div>
          </div>
        </>
      )}

      {question.question_type === "video" && (
        <>
          <Textarea
            placeholder="Expected answer / rubric (used by AI to grade transcript)"
            value={question.expected_answer}
            onChange={(e) => update("expected_answer", e.target.value)}
            rows={3}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Max score</Label>
              <Input
                type="number"
                value={question.max_score}
                onChange={(e) => update("max_score", Number(e.target.value) || 1)}
              />
            </div>
            <div>
              <Label className="text-xs">Time limit (sec)</Label>
              <Input
                type="number"
                value={question.time_limit_seconds ?? 120}
                onChange={(e) => update("time_limit_seconds", Number(e.target.value) || 120)}
              />
            </div>
          </div>
        </>
      )}

      {question.question_type === "coding" && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Language</Label>
              <Input
                placeholder="python, javascript, java..."
                value={question.language}
                onChange={(e) => update("language", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Max score</Label>
              <Input
                type="number"
                value={question.max_score}
                onChange={(e) => update("max_score", Number(e.target.value) || 1)}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Starter code (optional)</Label>
            <Textarea
              placeholder="// student starts editing from this code"
              value={question.starter_code}
              onChange={(e) => update("starter_code", e.target.value)}
              rows={4}
              className="font-mono text-xs"
            />
          </div>
          <div>
            <Label className="text-xs">Expected answer / sample I/O (used by AI to grade submission)</Label>
            <Textarea
              value={question.expected_answer}
              onChange={(e) => update("expected_answer", e.target.value)}
              rows={3}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default TypedQuestionEditor;
