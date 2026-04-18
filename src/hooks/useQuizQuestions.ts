import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mcqBank } from "@/data/videoContent";
import { toast } from "sonner";

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

/**
 * Hook that manages quiz questions with AI generation + question bank fallback.
 * 
 * Flow:
 * 1. First attempt → use static mcqBank questions (shuffled)
 * 2. Retake → call AI to generate fresh questions, store them in question bank
 * 3. If AI fails → pull unused questions from question bank
 * 4. If bank exhausted → reshuffle all available (static + bank) questions
 */
export function useQuizQuestions(moduleId: number, moduleName: string) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [usedQuestionHashes, setUsedQuestionHashes] = useState<Set<string>>(new Set());

  // Pull adaptive context for the AI Agent: age group + recent score → difficulty
  const ageGroup = (typeof window !== "undefined" && sessionStorage.getItem("studentAgeGroup")) || "";
  const studentId = (typeof window !== "undefined" && sessionStorage.getItem("studentId")) || "";

  const computeAdaptiveDifficulty = async (): Promise<"easy" | "medium" | "hard"> => {
    const RANK: Record<"easy" | "medium" | "hard", number> = { easy: 0, medium: 1, hard: 2 };
    const RANK_INV: Array<"easy" | "medium" | "hard"> = ["easy", "medium", "hard"];
    const clamp = (
      d: "easy" | "medium" | "hard",
      floor: "easy" | "medium" | "hard",
      ceiling: "easy" | "medium" | "hard"
    ) => RANK_INV[Math.max(RANK[floor], Math.min(RANK[ceiling], RANK[d]))];

    // Defaults if admin overrides aren't configured
    const DEFAULT_OVERRIDES: Record<string, { floor: "easy" | "medium" | "hard"; ceiling: "easy" | "medium" | "hard" }> = {
      "10-14": { floor: "easy", ceiling: "easy" },
      "15-18": { floor: "easy", ceiling: "medium" },
      "19-22": { floor: "easy", ceiling: "hard" },
      "23+":   { floor: "easy", ceiling: "hard" },
    };

    // Fetch admin overrides (non-blocking on failure)
    let overrides = DEFAULT_OVERRIDES;
    try {
      const { data: settings } = await supabase
        .from("llm_settings")
        .select("age_group_difficulty_overrides" as any)
        .limit(1)
        .maybeSingle();
      const rawOverrides = (settings as any)?.age_group_difficulty_overrides;
      if (rawOverrides && Object.keys(rawOverrides).length) {
        overrides = { ...DEFAULT_OVERRIDES, ...rawOverrides };
      }
    } catch {
      /* keep defaults */
    }

    const cfg = overrides[ageGroup] || { floor: "easy" as const, ceiling: "hard" as const };
    const base = cfg.floor;

    if (!studentId) return clamp(base, cfg.floor, cfg.ceiling);
    try {
      const { data } = await supabase
        .from("student_assessment_scores")
        .select("score")
        .eq("student_id", studentId)
        .order("attempted_at", { ascending: false })
        .limit(3);
      const scores = (data || []).map((r: any) => r.score || 0);
      if (scores.length === 0) return clamp(base, cfg.floor, cfg.ceiling);
      const avg = scores.reduce((s, x) => s + x, 0) / scores.length;
      // Performance-driven target, then clamp to admin floor/ceiling for this age group
      let target: "easy" | "medium" | "hard" = base;
      if (avg >= 85) target = "hard";
      else if (avg >= 70) target = "medium";
      return clamp(target, cfg.floor, cfg.ceiling);
    } catch {
      return clamp(base, cfg.floor, cfg.ceiling);
    }
  };

  const hashQuestion = (q: QuizQuestion) => q.question.trim().toLowerCase().slice(0, 80);

  const shuffle = <T,>(arr: T[]): T[] => {
    const s = [...arr];
    for (let i = s.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [s[i], s[j]] = [s[j], s[i]];
    }
    return s;
  };

  const getStaticQuestions = (): QuizQuestion[] =>
    mcqBank
      .filter((q) => q.moduleId === moduleId)
      .map(({ question, options, correct, explanation }) => ({ question, options, correct, explanation }));

  const fetchBankQuestions = async (): Promise<QuizQuestion[]> => {
    const { data } = await supabase
      .from("quiz_question_bank")
      .select("question, options, correct, explanation")
      .eq("module_id", moduleId);

    if (!data) return [];
    return data.map((row: any) => ({
      question: row.question,
      options: Array.isArray(row.options) ? row.options : JSON.parse(row.options),
      correct: row.correct,
      explanation: row.explanation,
    }));
  };

  const generateAIQuestions = async (): Promise<QuizQuestion[] | null> => {
    try {
      const difficulty = await computeAdaptiveDifficulty();
      const { data, error } = await supabase.functions.invoke("generate-video-quiz", {
        body: { videoTitle: moduleName, moduleName, questionCount: 10, ageGroup, difficulty },
      });
      if (error || !data?.questions) return null;
      return data.questions as QuizQuestion[];
    } catch {
      return null;
    }
  };

  const storeToBankAndReturn = async (newQuestions: QuizQuestion[]): Promise<QuizQuestion[]> => {
    // Only store questions not already in the bank (by hash)
    const bankExisting = await fetchBankQuestions();
    const existingHashes = new Set(bankExisting.map(hashQuestion));

    const toInsert = newQuestions.filter((q) => !existingHashes.has(hashQuestion(q)));

    if (toInsert.length > 0) {
      await supabase.from("quiz_question_bank").insert(
        toInsert.map((q) => ({
          module_id: moduleId,
          module_name: moduleName,
          question: q.question,
          options: q.options,
          correct: q.correct,
          explanation: q.explanation,
          source: "ai",
        }))
      );
    }

    return newQuestions;
  };

  const mirrorStaticToBank = async (qs: QuizQuestion[]) => {
    if (qs.length === 0) return;
    const bankExisting = await fetchBankQuestions();
    const existingHashes = new Set(bankExisting.map(hashQuestion));
    const toInsert = qs.filter((q) => !existingHashes.has(hashQuestion(q)));
    if (toInsert.length === 0) return;
    await supabase.from("quiz_question_bank").insert(
      toInsert.map((q) => ({
        module_id: moduleId,
        module_name: moduleName,
        question: q.question,
        options: q.options,
        correct: q.correct,
        explanation: q.explanation,
        source: "student_quiz",
      }))
    );
  };

  const loadQuestions = useCallback(async (isRetake: boolean) => {
    setLoading(true);

    if (!isRetake) {
      // First attempt: use static questions shuffled + mirror to bank
      const staticQs = shuffle(getStaticQuestions());
      setQuestions(staticQs);
      setAttemptCount(1);
      setUsedQuestionHashes(new Set(staticQs.map(hashQuestion)));
      // fire-and-forget mirror so the bank captures any new static questions
      mirrorStaticToBank(staticQs).catch(() => {});
      setLoading(false);
      return;
    }

    // Retake: try AI first
    setAttemptCount((c) => c + 1);
    toast.info("Generating fresh questions with AI...");

    const aiQuestions = await generateAIQuestions();

    if (aiQuestions && aiQuestions.length > 0) {
      const stored = await storeToBankAndReturn(aiQuestions);
      const newHashes = new Set(stored.map(hashQuestion));
      setUsedQuestionHashes((prev) => new Set([...prev, ...newHashes]));
      setQuestions(shuffle(stored));
      toast.success("New AI-generated questions loaded!");
      setLoading(false);
      return;
    }

    // AI failed — pull from question bank (unused questions first)
    toast.info("Pulling questions from question bank...");
    const bankQs = await fetchBankQuestions();
    const staticQs = getStaticQuestions();
    const allQs = [...staticQs, ...bankQs];

    // Deduplicate
    const seen = new Set<string>();
    const unique = allQs.filter((q) => {
      const h = hashQuestion(q);
      if (seen.has(h)) return false;
      seen.add(h);
      return true;
    });

    // Prefer unused questions
    const unused = unique.filter((q) => !usedQuestionHashes.has(hashQuestion(q)));

    if (unused.length >= 5) {
      setQuestions(shuffle(unused));
      setUsedQuestionHashes((prev) => new Set([...prev, ...unused.map(hashQuestion)]));
    } else {
      // All exhausted — reset and reshuffle everything
      setQuestions(shuffle(unique));
      setUsedQuestionHashes(new Set(unique.map(hashQuestion)));
      toast.info("All questions cycled — reshuffled full question bank.");
    }

    setLoading(false);
  }, [moduleId, moduleName, usedQuestionHashes]);

  return { questions, loading, loadQuestions, attemptCount };
}
