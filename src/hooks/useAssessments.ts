import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type QuestionType = "mcq" | "descriptive" | "video" | "coding";

export interface Assessment {
  id: string;
  title: string;
  description: string;
  module_id: number | null;
  created_by: string;
  created_by_name: string;
  assigned_colleges: string[];
  time_limit_minutes: number | null;
  max_attempts: number | null;
  passing_score: number;
  status: string;
  question_count: number;
  created_at: string;
  proctoring_enabled: boolean;
  // New fields
  source_mode: "topic" | "jd";
  topic_or_skills: string;
  jd_text: string;
  jd_file_url: string;
  start_at: string | null;
  end_at: string | null;
  question_mix: { mcq: number; descriptive: number; video: number; coding: number };
}

export interface AssessmentQuestion {
  id: string;
  assessment_id: string;
  question: string;
  options: string[];
  correct: number | null;
  explanation: string;
  sort_order: number;
  source: string;
  // New
  question_type: QuestionType;
  expected_answer: string;
  max_score: number;
  time_limit_seconds: number | null;
  starter_code: string;
  language: string;
}

export interface AssessmentAttempt {
  id: string;
  assessment_id: string;
  student_id: string;
  student_name: string;
  student_college: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  time_taken_seconds: number | null;
  answers: Record<string, number>;
  started_at: string;
  completed_at: string | null;
  responses?: Record<string, any>;
  ai_grading?: Record<string, { score: number; max: number; feedback: string }>;
  grading_status?: string;
}

export function useAssessments(filterStatus?: string) {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssessments = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("assessments").select("*").order("created_at", { ascending: false });
    if (filterStatus && filterStatus !== "all") {
      query = query.eq("status", filterStatus);
    }
    const { data, error } = await query;
    if (error) {
      console.error("Error fetching assessments:", error);
    } else {
      setAssessments((data || []).map((a: any) => ({
        ...a,
        assigned_colleges: Array.isArray(a.assigned_colleges) ? a.assigned_colleges : [],
        question_mix: a.question_mix && typeof a.question_mix === "object"
          ? { mcq: 0, descriptive: 0, video: 0, coding: 0, ...a.question_mix }
          : { mcq: 0, descriptive: 0, video: 0, coding: 0 },
        source_mode: a.source_mode || "topic",
        topic_or_skills: a.topic_or_skills || "",
        jd_text: a.jd_text || "",
        jd_file_url: a.jd_file_url || "",
        start_at: a.start_at || null,
        end_at: a.end_at || null,
      })));
    }
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { fetchAssessments(); }, [fetchAssessments]);

  return { assessments, loading, refetch: fetchAssessments };
}

export function useAssessmentQuestions(assessmentId: string | null) {
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!assessmentId) { setQuestions([]); return; }
    setLoading(true);
    supabase
      .from("assessment_questions")
      .select("*")
      .eq("assessment_id", assessmentId)
      .order("sort_order")
      .then(({ data, error }) => {
        if (!error && data) {
          setQuestions(data.map((q: any) => ({
            ...q,
            options: Array.isArray(q.options)
              ? q.options
              : (typeof q.options === "string" ? JSON.parse(q.options) : []),
            question_type: q.question_type || "mcq",
            expected_answer: q.expected_answer || "",
            max_score: q.max_score ?? 1,
            time_limit_seconds: q.time_limit_seconds ?? null,
            starter_code: q.starter_code || "",
            language: q.language || "",
          })));
        }
        setLoading(false);
      });
  }, [assessmentId]);

  return { questions, loading };
}

export function useAssessmentAttempts(assessmentId?: string) {
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAttempts = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("assessment_attempts").select("*").order("completed_at", { ascending: false });
    if (assessmentId) {
      query = query.eq("assessment_id", assessmentId);
    }
    const { data } = await query;
    setAttempts((data || []).map((a: any) => ({
      ...a,
      answers: typeof a.answers === "object" ? a.answers : {},
      responses: typeof a.responses === "object" ? a.responses : {},
      ai_grading: typeof a.ai_grading === "object" ? a.ai_grading : {},
      grading_status: a.grading_status || "pending",
    })));
    setLoading(false);
  }, [assessmentId]);

  useEffect(() => { fetchAttempts(); }, [fetchAttempts]);

  return { attempts, loading, refetch: fetchAttempts };
}

export type CreateAssessmentInput = {
  title: string;
  description: string;
  module_id: number | null;
  created_by: string;
  created_by_name: string;
  assigned_colleges: string[];
  time_limit_minutes: number | null;
  max_attempts: number | null;
  passing_score: number;
  proctoring_enabled?: boolean;
  source_mode?: "topic" | "jd";
  topic_or_skills?: string;
  jd_text?: string;
  jd_file_url?: string;
  start_at?: string | null;
  end_at?: string | null;
  question_mix?: { mcq: number; descriptive: number; video: number; coding: number };
  questions: Omit<AssessmentQuestion, "id" | "assessment_id" | "created_at" | "sort_order">[];
};

export async function createAssessment(assessment: CreateAssessmentInput) {
  const { questions, ...assessmentData } = assessment;

  const { data: inserted, error } = await supabase
    .from("assessments")
    .insert({
      ...assessmentData,
      question_count: questions.length,
      status: "published",
      proctoring_enabled: assessmentData.proctoring_enabled || false,
    } as any)
    .select()
    .single();

  if (error || !inserted) {
    console.error("createAssessment error", error);
    toast.error("Failed to create assessment");
    return null;
  }

  const questionRows = questions.map((q, i) => ({
    assessment_id: (inserted as any).id,
    question: q.question,
    options: q.options || [],
    correct: q.question_type === "mcq" ? q.correct : null,
    explanation: q.explanation || "",
    sort_order: i,
    source: q.source || "manual",
    question_type: q.question_type,
    expected_answer: q.expected_answer || "",
    max_score: q.max_score ?? (q.question_type === "mcq" ? 1 : 5),
    time_limit_seconds: q.time_limit_seconds ?? null,
    starter_code: q.starter_code || "",
    language: q.language || "",
  }));

  const { error: qError } = await supabase.from("assessment_questions").insert(questionRows as any);
  if (qError) {
    console.error("question insert error", qError);
    toast.error("Assessment created but questions failed to save");
    return (inserted as any).id;
  }

  await mirrorToQuestionBank(assessmentData.module_id, questions);

  toast.success(`Assessment "${assessment.title}" created with ${questions.length} questions!`);
  return (inserted as any).id;
}

async function mirrorToQuestionBank(
  moduleId: number | null,
  questions: Omit<AssessmentQuestion, "id" | "assessment_id" | "created_at" | "sort_order">[]
) {
  if (!moduleId || questions.length === 0) return;

  const { data: mod } = await supabase
    .from("admin_modules")
    .select("title")
    .eq("id", moduleId)
    .maybeSingle();
  const moduleName = (mod as any)?.title || `Module ${moduleId}`;

  const { data: existing } = await supabase
    .from("quiz_question_bank")
    .select("question")
    .eq("module_id", moduleId);
  const existingSet = new Set(
    (existing || []).map((r: any) => (r.question || "").trim().toLowerCase().slice(0, 80))
  );

  const rows = questions
    .filter((q) => !existingSet.has(q.question.trim().toLowerCase().slice(0, 80)))
    .map((q) => ({
      module_id: moduleId,
      module_name: moduleName,
      question: q.question,
      options: q.options || [],
      correct: q.question_type === "mcq" ? (q.correct ?? 0) : 0,
      explanation: q.explanation || "",
      source: "assessment",
      question_type: q.question_type,
      expected_answer: q.expected_answer || "",
    }));

  if (rows.length > 0) {
    await supabase.from("quiz_question_bank").insert(rows as any);
  }
}

export async function updateAssessment(assessmentId: string, assessment: Omit<CreateAssessmentInput, "created_by" | "created_by_name">) {
  const { questions, ...assessmentData } = assessment;

  const { error } = await supabase
    .from("assessments")
    .update({
      ...assessmentData,
      question_count: questions.length,
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", assessmentId);

  if (error) {
    toast.error("Failed to update assessment");
    return false;
  }

  await supabase.from("assessment_questions").delete().eq("assessment_id", assessmentId);

  const questionRows = questions.map((q, i) => ({
    assessment_id: assessmentId,
    question: q.question,
    options: q.options || [],
    correct: q.question_type === "mcq" ? q.correct : null,
    explanation: q.explanation || "",
    sort_order: i,
    source: q.source || "manual",
    question_type: q.question_type,
    expected_answer: q.expected_answer || "",
    max_score: q.max_score ?? (q.question_type === "mcq" ? 1 : 5),
    time_limit_seconds: q.time_limit_seconds ?? null,
    starter_code: q.starter_code || "",
    language: q.language || "",
  }));

  const { error: qError } = await supabase.from("assessment_questions").insert(questionRows as any);
  if (qError) {
    toast.error("Assessment updated but questions failed to save");
    return false;
  }

  await mirrorToQuestionBank(assessmentData.module_id, questions);

  toast.success(`Assessment "${assessment.title}" updated with ${questions.length} questions!`);
  return true;
}

export async function submitAssessmentAttempt(attempt: {
  assessment_id: string;
  student_id: string;
  student_name: string;
  student_college: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  time_taken_seconds: number | null;
  answers: Record<string, number>;
  responses?: Record<string, any>;
}) {
  const { data, error } = await supabase
    .from("assessment_attempts")
    .insert({
      ...attempt,
      responses: attempt.responses || {},
      grading_status: "pending",
      completed_at: new Date().toISOString(),
    } as any)
    .select()
    .single();

  if (error) {
    toast.error("Failed to submit assessment");
    return null;
  }

  return (data as any)?.id || null;
}
