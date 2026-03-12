import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { moduleNames } from "@/data/videoContent";

export interface StudentData {
  id: string;
  name: string;
  email: string;
  college: string;
  location: string;
  mobile: string;
  progress: number;
  modulesCompleted: number;
  avgScore: number;
  moduleScores: { moduleId: number; moduleName: string; score: number; totalQuestions: number; correctAnswers: number }[];
  moduleProgress: { moduleId: number; completed: boolean; progressPercent: number }[];
}

export interface ModuleStats {
  name: string;
  enrolled: number;
  completed: number;
}

export interface ScoreDistItem {
  name: string;
  value: number;
  color: string;
}

export function useTrainerData() {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [{ data: studentsRaw }, { data: progressRaw }, { data: scoresRaw }] = await Promise.all([
      supabase.from("students").select("*"),
      supabase.from("student_module_progress").select("*"),
      supabase.from("student_assessment_scores").select("*"),
    ]);

    if (!studentsRaw) { setLoading(false); return; }

    const mapped: StudentData[] = studentsRaw.map((s: any) => {
      const prog = (progressRaw || []).filter((p: any) => p.student_id === s.id);
      const scores = (scoresRaw || []).filter((sc: any) => sc.student_id === s.id);
      const modulesCompleted = prog.filter((p: any) => p.completed).length;
      const totalProgress = prog.length > 0
        ? Math.round(prog.reduce((sum: number, p: any) => sum + p.progress_percent, 0) / 10)
        : 0;
      const avgScore = scores.length > 0
        ? Math.round(scores.reduce((sum: number, sc: any) => sum + sc.score, 0) / scores.length)
        : 0;

      return {
        id: s.id,
        name: s.name,
        email: s.email,
        college: s.college,
        location: s.location,
        mobile: s.mobile,
        progress: totalProgress,
        modulesCompleted,
        avgScore,
        moduleScores: scores.map((sc: any) => ({
          moduleId: sc.module_id,
          moduleName: (moduleNames as Record<number, string>)[sc.module_id] || `Module ${sc.module_id}`,
          score: sc.score,
          totalQuestions: sc.total_questions,
          correctAnswers: sc.correct_answers,
        })),
        moduleProgress: prog.map((p: any) => ({
          moduleId: p.module_id,
          completed: p.completed,
          progressPercent: p.progress_percent,
        })),
      };
    });

    setStudents(mapped);
    setLoading(false);
  }

  const totalStudents = students.length;
  const avgProgress = students.length > 0
    ? Math.round(students.reduce((s, st) => s + st.progress, 0) / students.length)
    : 0;
  const avgOverallScore = students.length > 0
    ? Math.round(students.reduce((s, st) => s + st.avgScore, 0) / students.length)
    : 0;

  // Module stats
  const moduleStats: ModuleStats[] = Object.entries(moduleNames).map(([id, name]) => {
    const mid = Number(id);
    const enrolled = students.filter(s => s.moduleProgress.some(p => p.moduleId === mid)).length;
    const completed = students.filter(s => s.moduleProgress.some(p => p.moduleId === mid && p.completed)).length;
    return { name: name as string, enrolled, completed };
  });

  // Score distribution
  const allScores = students.map(s => s.avgScore).filter(s => s > 0);
  const scoreDistribution: ScoreDistItem[] = [
    { name: "90-100%", value: allScores.filter(s => s >= 90).length, color: "hsl(var(--success))" },
    { name: "70-89%", value: allScores.filter(s => s >= 70 && s < 90).length, color: "hsl(var(--primary))" },
    { name: "50-69%", value: allScores.filter(s => s >= 50 && s < 70).length, color: "hsl(var(--warning))" },
    { name: "Below 50%", value: allScores.filter(s => s < 50).length, color: "hsl(var(--destructive))" },
  ];

  return { students, loading, totalStudents, avgProgress, avgOverallScore, moduleStats, scoreDistribution };
}
