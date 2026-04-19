import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardCheck, Clock, Trophy, ArrowRight, Loader2, Timer, AlertTriangle,
  CheckCircle, XCircle, Shield, Video, Mic, Square, Code2, FileText, ListChecks, Play,
} from "lucide-react";
import {
  useAssessments,
  useAssessmentQuestions,
  useAssessmentAttempts,
  submitAssessmentAttempt,
  type Assessment,
  type AssessmentQuestion,
} from "@/hooks/useAssessments";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ProctoringMonitor from "./ProctoringMonitor";

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

// ---------- Per-type input components ----------

function McqInput({ q, value, onChange, disabled }: {
  q: AssessmentQuestion; value: number | undefined; onChange: (v: number) => void; disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      {q.options.map((opt, oi) => (
        <button
          key={oi}
          type="button"
          onClick={() => !disabled && onChange(oi)}
          disabled={disabled}
          className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-colors ${
            value === oi
              ? "border-primary bg-primary/5 text-foreground"
              : "border-border text-muted-foreground hover:border-primary/30"
          }`}
        >
          {String.fromCharCode(65 + oi)}. {opt}
        </button>
      ))}
    </div>
  );
}

function DescriptiveInput({ value, onChange, disabled }: {
  value: string; onChange: (v: string) => void; disabled: boolean;
}) {
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder="Type your answer here..."
      rows={6}
      className="resize-y"
    />
  );
}

function CodingInput({ q, code, onChange, disabled, onRun, stdout, running }: {
  q: AssessmentQuestion; code: string; onChange: (v: string) => void; disabled: boolean;
  onRun: () => void; stdout: string; running: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Code2 className="h-3.5 w-3.5" />
        <span>Language: <strong className="text-foreground">{q.language || "any"}</strong></span>
      </div>
      <Textarea
        value={code}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={10}
        className="font-mono text-xs resize-y"
        placeholder={q.starter_code || "// write your solution"}
      />
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onRun} disabled={disabled || running} className="gap-1.5">
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          Run
        </Button>
        {stdout && (
          <span className="text-[10px] text-muted-foreground">Output captured ({stdout.length} chars)</span>
        )}
      </div>
      {stdout && (
        <pre className="bg-muted rounded p-2 text-[11px] max-h-32 overflow-y-auto whitespace-pre-wrap">{stdout}</pre>
      )}
    </div>
  );
}

function VideoInput({ onUploaded, disabled, attemptId, qid }: {
  onUploaded: (data: { url: string; transcript: string }) => void;
  disabled: boolean; attemptId: string; qid: string;
}) {
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [done, setDone] = useState(false);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "video/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setRecorded(blob);
        setPreviewUrl(URL.createObjectURL(blob));
      };
      mr.start();
      mediaRecRef.current = mr;
      setRecording(true);
    } catch (e) {
      toast.error("Camera/Mic access denied");
    }
  };

  const stop = () => {
    mediaRecRef.current?.stop();
    setRecording(false);
  };

  const upload = async () => {
    if (!recorded) return;
    setUploading(true);
    const path = `video-answers/${attemptId}/${qid}.webm`;
    const { error } = await supabase.storage.from("assessment-uploads").upload(path, recorded, {
      contentType: "video/webm", upsert: true,
    });
    if (error) {
      setUploading(false);
      toast.error("Upload failed");
      return;
    }
    const { data: pub } = supabase.storage.from("assessment-uploads").getPublicUrl(path);
    setUploading(false);
    setTranscribing(true);
    // Transcribe via existing transcribe-audio function: send base64 audio
    let transcript = "";
    try {
      const arr = await recorded.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arr).slice(0, 0))) ; // placeholder; below
      // proper base64 of full file
      const full = await blobToBase64(recorded);
      const { data: tr } = await supabase.functions.invoke("transcribe-audio", { body: { audio: full } });
      transcript = (tr as any)?.text || "";
    } catch (e) {
      console.error("transcribe failed", e);
    }
    setTranscribing(false);
    setDone(true);
    onUploaded({ url: pub.publicUrl, transcript });
    toast.success("Video answer saved");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {!recording && !recorded && (
          <Button type="button" size="sm" onClick={start} disabled={disabled} className="gap-1.5">
            <Video className="h-3.5 w-3.5" /> Record Answer
          </Button>
        )}
        {recording && (
          <Button type="button" size="sm" variant="destructive" onClick={stop} className="gap-1.5">
            <Square className="h-3.5 w-3.5" /> Stop
          </Button>
        )}
        {recorded && !done && (
          <>
            <Button type="button" size="sm" onClick={upload} disabled={uploading || transcribing} className="gap-1.5">
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
              {uploading ? "Uploading..." : transcribing ? "Transcribing..." : "Upload & Transcribe"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => { setRecorded(null); setPreviewUrl(""); }}>
              Re-record
            </Button>
          </>
        )}
        {done && <Badge variant="secondary" className="gap-1"><CheckCircle className="h-3 w-3" /> Submitted</Badge>}
      </div>
      {previewUrl && <video src={previewUrl} controls className="w-full max-w-md rounded border border-border" />}
    </div>
  );
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onloadend = () => {
      const s = String(r.result || "");
      res(s.split(",")[1] || "");
    };
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

// ---------- Take assessment ----------

const TakeAssessment = ({
  assessment, onBack, studentId, studentName, studentCollege,
}: {
  assessment: Assessment; onBack: () => void;
  studentId: string; studentName: string; studentCollege: string;
}) => {
  const { questions, loading } = useAssessmentQuestions(assessment.id);
  const { attempts, refetch: refetchAttempts } = useAssessmentAttempts(assessment.id);
  // responses keyed by question id
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [grading, setGrading] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [attemptId] = useState(() => crypto.randomUUID());
  const [result, setResult] = useState<{ score: number; grading: Record<string, any> } | null>(null);
  const [codeRunning, setCodeRunning] = useState<Record<string, boolean>>({});
  const isProctoringEnabled = assessment.proctoring_enabled;

  const myAttempts = useMemo(() =>
    attempts.filter(a => a.student_id === studentId),
    [attempts, studentId]
  );
  const canAttempt = !assessment.max_attempts || myAttempts.length < assessment.max_attempts;

  // Schedule gating
  const now = Date.now();
  const startsAt = assessment.start_at ? new Date(assessment.start_at).getTime() : null;
  const endsAt = assessment.end_at ? new Date(assessment.end_at).getTime() : null;
  const notYetOpen = !!(startsAt && now < startsAt);
  const closed = !!(endsAt && now > endsAt);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    const timeTaken = Math.round((Date.now() - startTime) / 1000);

    // Build legacy answers map (mcq only) for backward compat
    const legacyAnswers: Record<string, number> = {};
    let mcqCorrect = 0; let mcqTotal = 0;
    for (const q of questions) {
      if (q.question_type === "mcq") {
        mcqTotal += 1;
        const picked = responses[q.id]?.choice;
        if (typeof picked === "number") legacyAnswers[q.id] = picked;
        if (picked === q.correct) mcqCorrect += 1;
      }
    }
    const provisionalScore = mcqTotal > 0 ? Math.round((mcqCorrect / mcqTotal) * 100) : 0;

    const newAttemptId = await submitAssessmentAttempt({
      assessment_id: assessment.id,
      student_id: studentId,
      student_name: studentName,
      student_college: studentCollege,
      score: provisionalScore,
      total_questions: questions.length,
      correct_answers: mcqCorrect,
      time_taken_seconds: timeTaken,
      answers: legacyAnswers,
      responses,
    });

    if (isProctoringEnabled && (window as any).__proctoringEndSession) {
      await (window as any).__proctoringEndSession();
    }

    setSubmitted(true);
    setSubmitting(false);

    if (newAttemptId) {
      setGrading(true);
      try {
        const { data, error } = await supabase.functions.invoke("grade-assessment-attempt", {
          body: { attempt_id: newAttemptId },
        });
        if (error) throw error;
        setResult({ score: (data as any)?.score || provisionalScore, grading: (data as any)?.grading || {} });
      } catch (e) {
        console.error("grading failed", e);
        toast.error("AI grading failed; partial score saved");
        setResult({ score: provisionalScore, grading: {} });
      }
      setGrading(false);
    }
    refetchAttempts();
  }, [responses, questions, assessment.id, studentId, studentName, studentCollege, startTime, submitting, isProctoringEnabled, refetchAttempts]);

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
  }, [started, submitted, assessment.time_limit_minutes, handleSubmit]);

  const handleStart = () => {
    setStarted(true);
    setStartTime(Date.now());
    setResponses({});
    setSubmitted(false);
    setResult(null);
  };

  const setQResponse = (qid: string, patch: any) =>
    setResponses((prev) => ({ ...prev, [qid]: { ...(prev[qid] || {}), ...patch } }));

  const runCode = async (q: AssessmentQuestion) => {
    setCodeRunning((p) => ({ ...p, [q.id]: true }));
    try {
      const code = responses[q.id]?.code || "";
      const { data, error } = await supabase.functions.invoke("execute-code", {
        body: { code, language: q.language || "python3" },
      });
      if (error) throw error;
      const out = (data as any)?.output || (data as any)?.stdout || "";
      setQResponse(q.id, { stdout: out });
    } catch (e) {
      toast.error("Code execution failed");
    }
    setCodeRunning((p) => ({ ...p, [q.id]: false }));
  };

  const allAnswered = useMemo(() => {
    return questions.every((q) => {
      const r = responses[q.id];
      if (!r) return false;
      if (q.question_type === "mcq") return typeof r.choice === "number";
      if (q.question_type === "descriptive") return (r.text || "").trim().length > 0;
      if (q.question_type === "coding") return (r.code || "").trim().length > 0;
      if (q.question_type === "video") return !!r.url;
      return true;
    });
  }, [questions, responses]);

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

          <div className="flex flex-wrap gap-2">
            {assessment.question_mix?.mcq > 0 && <Badge variant="secondary" className="gap-1"><ListChecks className="h-3 w-3" /> {assessment.question_mix.mcq} MCQ</Badge>}
            {assessment.question_mix?.descriptive > 0 && <Badge variant="secondary" className="gap-1"><FileText className="h-3 w-3" /> {assessment.question_mix.descriptive} Descriptive</Badge>}
            {assessment.question_mix?.video > 0 && <Badge variant="secondary" className="gap-1"><Video className="h-3 w-3" /> {assessment.question_mix.video} Video</Badge>}
            {assessment.question_mix?.coding > 0 && <Badge variant="secondary" className="gap-1"><Code2 className="h-3 w-3" /> {assessment.question_mix.coding} Coding</Badge>}
          </div>

          {(assessment.start_at || assessment.end_at) && (
            <div className="text-xs text-muted-foreground bg-muted/40 rounded p-2 flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              {assessment.start_at && <span>Opens {new Date(assessment.start_at).toLocaleString()}</span>}
              {assessment.start_at && assessment.end_at && <span>•</span>}
              {assessment.end_at && <span>Closes {new Date(assessment.end_at).toLocaleString()}</span>}
            </div>
          )}

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
            disabled={!canAttempt || notYetOpen || closed}
            className="w-full bg-gradient-primary border-0 text-primary-foreground gap-2"
            size="lg"
          >
            {!canAttempt ? <><AlertTriangle className="h-4 w-4" /> Max attempts reached</>
             : notYetOpen ? <><Clock className="h-4 w-4" /> Not yet open</>
             : closed ? <><AlertTriangle className="h-4 w-4" /> Closed</>
             : <><ArrowRight className="h-4 w-4" /> Start Assessment</>}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isProctoringEnabled && started && !submitted && (
        <ProctoringMonitor
          attemptId={attemptId}
          assessmentId={assessment.id}
          studentId={studentId}
          studentName={studentName}
          isActive={started && !submitted}
        />
      )}

      <div className="flex items-center justify-between sticky top-16 z-40 bg-background py-3">
        <div>
          <h3 className="font-display font-semibold text-foreground">{assessment.title}</h3>
          <p className="text-xs text-muted-foreground">
            {Object.keys(responses).length}/{questions.length} answered
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

      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
        {questions.map((q, qi) => {
          const r = responses[q.id] || {};
          const g = result?.grading?.[q.id];
          return (
            <div key={q.id} className="bg-card rounded-lg border border-border p-5 shadow-card">
              <div className="flex items-start justify-between mb-3 gap-3">
                <p className="font-medium text-card-foreground text-sm flex-1">{qi + 1}. {q.question}</p>
                <Badge variant="outline" className="text-[10px] capitalize">{q.question_type} · {q.max_score}pt</Badge>
              </div>

              {q.question_type === "mcq" && (
                <McqInput q={q} value={r.choice} onChange={(v) => setQResponse(q.id, { choice: v })} disabled={submitted} />
              )}
              {q.question_type === "descriptive" && (
                <DescriptiveInput value={r.text || ""} onChange={(v) => setQResponse(q.id, { text: v })} disabled={submitted} />
              )}
              {q.question_type === "coding" && (
                <CodingInput
                  q={q}
                  code={r.code ?? q.starter_code ?? ""}
                  onChange={(v) => setQResponse(q.id, { code: v })}
                  disabled={submitted}
                  onRun={() => runCode(q)}
                  stdout={r.stdout || ""}
                  running={!!codeRunning[q.id]}
                />
              )}
              {q.question_type === "video" && (
                <VideoInput
                  attemptId={attemptId}
                  qid={q.id}
                  disabled={submitted}
                  onUploaded={({ url, transcript }) => setQResponse(q.id, { url, transcript })}
                />
              )}

              {submitted && g && (
                <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy className="h-3.5 w-3.5 text-warning" />
                    <span className="font-medium text-foreground">{g.score}/{g.max} points</span>
                  </div>
                  {g.feedback && <p className="text-muted-foreground italic">{g.feedback}</p>}
                </div>
              )}
              {submitted && q.question_type === "mcq" && q.explanation && (
                <p className="text-xs text-muted-foreground mt-2 italic">💡 {q.explanation}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 pt-4 border-t border-border">
        {!submitted ? (
          <Button
            onClick={handleSubmit}
            disabled={submitting || !allAnswered}
            className="bg-gradient-primary border-0 text-primary-foreground gap-2"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
            Submit Assessment
          </Button>
        ) : (
          <div className="flex items-center gap-4 w-full flex-wrap">
            {grading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> AI grading in progress...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Trophy className={`h-5 w-5 ${(result?.score ?? 0) >= assessment.passing_score ? "text-warning" : "text-destructive"}`} />
                <p className="font-display font-bold text-foreground">
                  {result?.score ?? 0}%
                </p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${(result?.score ?? 0) >= assessment.passing_score ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                  {(result?.score ?? 0) >= assessment.passing_score ? "PASSED" : "FAILED"}
                </span>
              </div>
            )}
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
                {a.proctoring_enabled && (
                  <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    <Shield className="h-3 w-3" /> Proctored
                  </span>
                )}
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
