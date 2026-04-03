import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
}

export interface AssessmentQuestion {
  id: string;
  assessment_id: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  sort_order: number;
  source: string;
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
        options: [],
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
            options: Array.isArray(q.options) ? q.options : JSON.parse(q.options),
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
    })));
    setLoading(false);
  }, [assessmentId]);

  useEffect(() => { fetchAttempts(); }, [fetchAttempts]);

  return { attempts, loading, refetch: fetchAttempts };
}

export async function createAssessment(assessment: {
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
  questions: Omit<AssessmentQuestion, "id" | "assessment_id" | "created_at">[];
}) {
  const { questions, ...assessmentData } = assessment;

  const { data: inserted, error } = await supabase
    .from("assessments")
    .insert({
      ...assessmentData,
      question_count: questions.length,
      status: "published",
    } as any)
    .select()
    .single();

  if (error || !inserted) {
    toast.error("Failed to create assessment");
    return null;
  }

  const questionRows = questions.map((q, i) => ({
    assessment_id: (inserted as any).id,
    question: q.question,
    options: q.options,
    correct: q.correct,
    explanation: q.explanation,
    sort_order: i,
    source: q.source,
  }));

  const { error: qError } = await supabase.from("assessment_questions").insert(questionRows as any);
  if (qError) {
    toast.error("Assessment created but questions failed to save");
    return (inserted as any).id;
  }

  toast.success(`Assessment "${assessment.title}" created with ${questions.length} questions!`);
  return (inserted as any).id;
}

export async function updateAssessment(assessmentId: string, assessment: {
  title: string;
  description: string;
  module_id: number | null;
  assigned_colleges: string[];
  time_limit_minutes: number | null;
  max_attempts: number | null;
  passing_score: number;
  questions: Omit<AssessmentQuestion, "id" | "assessment_id" | "created_at">[];
}) {
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

  // Delete old questions and insert new ones
  await supabase.from("assessment_questions").delete().eq("assessment_id", assessmentId);

  const questionRows = questions.map((q, i) => ({
    assessment_id: assessmentId,
    question: q.question,
    options: q.options,
    correct: q.correct,
    explanation: q.explanation,
    sort_order: i,
    source: q.source,
  }));

  const { error: qError } = await supabase.from("assessment_questions").insert(questionRows as any);
  if (qError) {
    toast.error("Assessment updated but questions failed to save");
    return false;
  }

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
}) {
  const { error } = await supabase.from("assessment_attempts").insert({
    ...attempt,
    completed_at: new Date().toISOString(),
  } as any);

  if (error) {
    toast.error("Failed to submit assessment");
    return false;
  }
  return true;
}
