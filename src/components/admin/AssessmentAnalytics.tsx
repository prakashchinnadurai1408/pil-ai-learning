import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Trophy, TrendingUp, TrendingDown, BarChart3, Users, Target,
  Loader2, Search, Download, Sparkles, AlertTriangle, CheckCircle, Star, FileText
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import {
  useAssessments,
  useAssessmentAttempts,
  type AssessmentAttempt,
  type Assessment,
} from "@/hooks/useAssessments";
import QuestionLevelAnalytics from "./QuestionLevelAnalytics";

const COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--destructive))", "hsl(var(--accent))"];

const AssessmentAnalytics = () => {
  const { assessments } = useAssessments();
  const { attempts, loading } = useAssessmentAttempts();
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [aiDiagnostics, setAiDiagnostics] = useState<string | null>(null);
  const [generatingDiagnostics, setGeneratingDiagnostics] = useState(false);

  const filteredAttempts = useMemo(() => {
    let result = attempts;
    if (selectedAssessmentId !== "all") {
      result = result.filter(a => a.assessment_id === selectedAssessmentId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a => a.student_name.toLowerCase().includes(q) || a.student_college.toLowerCase().includes(q));
    }
    return result;
  }, [attempts, selectedAssessmentId, searchQuery]);

  // Aggregate stats
  const stats = useMemo(() => {
    if (filteredAttempts.length === 0) return null;
    const scores = filteredAttempts.map(a => a.score);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const uniqueStudents = new Set(filteredAttempts.map(a => a.student_name)).size;
    const passCount = filteredAttempts.filter(a => {
      const assessment = assessments.find(as => as.id === a.assessment_id);
      return a.score >= (assessment?.passing_score || 60);
    }).length;
    const passRate = Math.round((passCount / filteredAttempts.length) * 100);
    return { avgScore, maxScore, minScore, uniqueStudents, totalAttempts: filteredAttempts.length, passRate };
  }, [filteredAttempts, assessments]);

  // Rankings - best score per student
  const rankings = useMemo(() => {
    const studentBest: Record<string, { name: string; college: string; bestScore: number; attempts: number; avgScore: number; totalScore: number }> = {};
    filteredAttempts.forEach(a => {
      if (!studentBest[a.student_name]) {
        studentBest[a.student_name] = { name: a.student_name, college: a.student_college, bestScore: 0, attempts: 0, avgScore: 0, totalScore: 0 };
      }
      const s = studentBest[a.student_name];
      s.bestScore = Math.max(s.bestScore, a.score);
      s.attempts += 1;
      s.totalScore += a.score;
    });
    return Object.values(studentBest)
      .map(s => ({ ...s, avgScore: Math.round(s.totalScore / s.attempts) }))
      .sort((a, b) => b.bestScore - a.bestScore);
  }, [filteredAttempts]);

  // Score distribution
  const scoreDistribution = useMemo(() => {
    const ranges = [
      { range: "0-20%", min: 0, max: 20, count: 0 },
      { range: "21-40%", min: 21, max: 40, count: 0 },
      { range: "41-60%", min: 41, max: 60, count: 0 },
      { range: "61-80%", min: 61, max: 80, count: 0 },
      { range: "81-100%", min: 81, max: 100, count: 0 },
    ];
    filteredAttempts.forEach(a => {
      const r = ranges.find(r => a.score >= r.min && a.score <= r.max);
      if (r) r.count++;
    });
    return ranges;
  }, [filteredAttempts]);

  // Assessment-wise performance
  const assessmentPerformance = useMemo(() => {
    const map: Record<string, { name: string; avgScore: number; attempts: number; total: number }> = {};
    filteredAttempts.forEach(a => {
      if (!map[a.assessment_id]) {
        const assessment = assessments.find(as => as.id === a.assessment_id);
        map[a.assessment_id] = { name: assessment?.title || "Unknown", avgScore: 0, attempts: 0, total: 0 };
      }
      map[a.assessment_id].attempts++;
      map[a.assessment_id].total += a.score;
    });
    return Object.values(map).map(m => ({ ...m, avgScore: Math.round(m.total / m.attempts) }));
  }, [filteredAttempts, assessments]);

  const generateAIDiagnostics = async () => {
    if (rankings.length === 0) return;
    setGeneratingDiagnostics(true);
    try {
      const summaryData = {
        totalStudents: rankings.length,
        avgScore: stats?.avgScore,
        passRate: stats?.passRate,
        topPerformers: rankings.slice(0, 5).map(r => ({ name: r.name, score: r.bestScore })),
        bottomPerformers: rankings.slice(-5).map(r => ({ name: r.name, score: r.bestScore })),
        scoreDistribution: scoreDistribution.map(s => ({ range: s.range, count: s.count })),
        assessmentPerformance: assessmentPerformance.map(a => ({ name: a.name, avgScore: a.avgScore, attempts: a.attempts })),
      };

      const { data, error } = await supabase.functions.invoke("chat", {
        body: {
          messages: [{
            role: "user",
            content: `Analyze this assessment data and provide a comprehensive diagnostic report with:
1. **Overall Performance Summary** - key insights
2. **Strengths** - what students are doing well
3. **Areas of Improvement** - gaps and weaknesses
4. **Top Performers** - recognition
5. **Students Needing Support** - who needs help
6. **Recommendations** - actionable steps for trainers

Data: ${JSON.stringify(summaryData)}

Format the response in clean markdown with headers and bullet points.`
          }],
          context: "assessment-analytics",
        },
      });
      if (error) throw error;
      setAiDiagnostics(data?.reply || data?.response || "No diagnostics generated");
    } catch {
      setAiDiagnostics("Failed to generate AI diagnostics. Please try again.");
    } finally {
      setGeneratingDiagnostics(false);
    }
  };

  const exportCSV = () => {
    const headers = ["Rank", "Student", "College", "Best Score", "Avg Score", "Attempts"];
    const rows = rankings.map((r, i) => [i + 1, r.name, r.college, r.bestScore, r.avgScore, r.attempts]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `assessment-rankings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedAssessmentId} onValueChange={setSelectedAssessmentId}>
          <SelectTrigger className="w-64"><SelectValue placeholder="All Assessments" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assessments</SelectItem>
            {assessments.map(a => (
              <SelectItem key={a.id} value={a.id}>{a.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search student..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <Button variant="outline" size="sm" className="gap-1" onClick={exportCSV}>
          <Download className="h-3 w-3" /> Export
        </Button>
        <Button
          size="sm"
          className="gap-1 bg-gradient-accent border-0 text-accent-foreground"
          onClick={generateAIDiagnostics}
          disabled={generatingDiagnostics || rankings.length === 0}
        >
          {generatingDiagnostics ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          AI Diagnostics
        </Button>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total Attempts", value: stats.totalAttempts, icon: BarChart3, color: "text-primary" },
            { label: "Unique Students", value: stats.uniqueStudents, icon: Users, color: "text-accent" },
            { label: "Avg Score", value: `${stats.avgScore}%`, icon: Target, color: "text-warning" },
            { label: "Pass Rate", value: `${stats.passRate}%`, icon: CheckCircle, color: "text-success" },
            { label: "Highest", value: `${stats.maxScore}%`, icon: TrendingUp, color: "text-success" },
            { label: "Lowest", value: `${stats.minScore}%`, icon: TrendingDown, color: "text-destructive" },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-card border border-border rounded-lg p-4 shadow-card">
                <Icon className={`h-4 w-4 ${s.color} mb-2`} />
                <p className="text-xl font-display font-bold text-card-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Charts row */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-5 shadow-card">
          <h4 className="font-display font-semibold text-sm mb-4">Score Distribution</h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={scoreDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="range" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {assessmentPerformance.length > 1 && (
          <div className="bg-card border border-border rounded-lg p-5 shadow-card">
            <h4 className="font-display font-semibold text-sm mb-4">Assessment-wise Avg Score</h4>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={assessmentPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 100]} fontSize={11} />
                <YAxis dataKey="name" type="category" width={120} fontSize={10} />
                <Tooltip />
                <Bar dataKey="avgScore" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* AI Diagnostics */}
      {aiDiagnostics && (
        <div className="bg-card border-2 border-accent/30 rounded-lg p-6 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-accent" />
            <h4 className="font-display font-semibold text-foreground">AI Diagnostic Report</h4>
          </div>
          <div className="prose prose-sm max-w-none text-card-foreground">
            {aiDiagnostics.split("\n").map((line, i) => {
              if (line.startsWith("# ")) return <h2 key={i} className="text-lg font-bold mt-4 mb-2">{line.slice(2)}</h2>;
              if (line.startsWith("## ")) return <h3 key={i} className="text-md font-semibold mt-3 mb-1">{line.slice(3)}</h3>;
              if (line.startsWith("**") && line.endsWith("**")) return <h4 key={i} className="font-semibold mt-2">{line.slice(2, -2)}</h4>;
              if (line.startsWith("- ")) return <li key={i} className="ml-4 text-sm">{line.slice(2)}</li>;
              if (line.trim()) return <p key={i} className="text-sm mb-1">{line}</p>;
              return <br key={i} />;
            })}
          </div>
        </div>
      )}

      {/* Question-Level Analytics */}
      <QuestionLevelAnalytics assessments={assessments} attempts={filteredAttempts} />

      {/* Rankings table */}
      <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h4 className="font-display font-semibold text-card-foreground flex items-center gap-2">
            <Trophy className="h-4 w-4 text-warning" /> Student Rankings
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="p-3 font-medium w-16">Rank</th>
                <th className="p-3 font-medium">Student</th>
                <th className="p-3 font-medium">College</th>
                <th className="p-3 font-medium">Best Score</th>
                <th className="p-3 font-medium">Avg Score</th>
                <th className="p-3 font-medium">Attempts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rankings.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">No assessment data yet</td></tr>
              ) : (
                rankings.map((r, i) => (
                  <tr key={r.name} className="hover:bg-muted/30">
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        {i < 3 ? (
                          <Star className={`h-4 w-4 ${i === 0 ? "text-warning fill-warning" : i === 1 ? "text-muted-foreground fill-muted-foreground" : "text-orange-400 fill-orange-400"}`} />
                        ) : (
                          <span className="text-sm text-muted-foreground font-mono">{i + 1}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                          {r.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </div>
                        <span className="text-sm font-medium text-card-foreground">{r.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">{r.college}</td>
                    <td className="p-3">
                      <span className={`text-sm font-bold ${r.bestScore >= 80 ? "text-success" : r.bestScore >= 60 ? "text-warning" : "text-destructive"}`}>
                        {r.bestScore}%
                      </span>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">{r.avgScore}%</td>
                    <td className="p-3 text-sm text-muted-foreground">{r.attempts}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AssessmentAnalytics;
