// Coordinator review flow — usable by trainer or admin role.
// Lists students with onboarding completion + quiz attempts + project submissions
// and lets the reviewer write feedback that's downloadable as a text report.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Download, Loader2, FileText, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import AIChatErrorBreakdown from "@/components/admin/AIChatErrorBreakdown";

interface Props {
  reviewerId: string;
  reviewerName: string;
  reviewerRole: "trainer" | "admin";
}

interface StudentRow {
  id: string;
  name: string;
  college: string;
  department: string;
  modulesCompleted: number;
  modulesInProgress: number;
  quizCount: number;
  avgScore: number;
  projectSubmissions: number;
  lastActivity: string;
  onboardingPct: number;
}

const ONBOARDING_STEPS = ["profile", "first_lesson", "first_quiz", "first_ai_chat", "first_project"];

const CoordinatorReview = ({ reviewerId, reviewerName, reviewerRole }: Props) => {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<StudentRow | null>(null);
  const [feedbackHistory, setFeedbackHistory] = useState<any[]>([]);
  const [feedbackText, setFeedbackText] = useState("");
  const [category, setCategory] = useState("general");
  const [posting, setPosting] = useState(false);
  const [details, setDetails] = useState<{ progress: any[]; scores: any[]; projects: any[] } | null>(null);

  useEffect(() => { void loadStudents(); }, []);

  const loadStudents = async () => {
    setLoading(true);
    const { data: studs } = await supabase.from("students")
      .select("id, name, college, department")
      .eq("status", "active").limit(500);
    if (!studs) { setLoading(false); return; }
    const ids = studs.map((s: any) => s.id);

    const [progRes, scoreRes, projRes] = await Promise.all([
      supabase.from("student_module_progress").select("student_id, completed, progress_percent, last_accessed").in("student_id", ids),
      supabase.from("student_assessment_scores").select("student_id, score").in("student_id", ids),
      supabase.from("student_project_progress").select("student_name, completed_steps, updated_at"),
    ]);

    const progByStu = new Map<string, any[]>();
    (progRes.data || []).forEach((p: any) => {
      const arr = progByStu.get(p.student_id) || [];
      arr.push(p); progByStu.set(p.student_id, arr);
    });
    const scoreByStu = new Map<string, number[]>();
    (scoreRes.data || []).forEach((s: any) => {
      const arr = scoreByStu.get(s.student_id) || [];
      arr.push(s.score || 0); scoreByStu.set(s.student_id, arr);
    });
    const projByName = new Map<string, any[]>();
    (projRes.data || []).forEach((p: any) => {
      const arr = projByName.get(p.student_name) || [];
      arr.push(p); projByName.set(p.student_name, arr);
    });

    const rows: StudentRow[] = studs.map((s: any) => {
      const progArr = progByStu.get(s.id) || [];
      const completed = progArr.filter((p) => p.completed || (p.progress_percent || 0) >= 80).length;
      const inProgress = progArr.filter((p) => !p.completed && (p.progress_percent || 0) > 0 && (p.progress_percent || 0) < 80).length;
      const scores = scoreByStu.get(s.id) || [];
      const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      const projs = projByName.get(s.name) || [];

      // Onboarding heuristic from observable data
      const steps = {
        profile: !!s.name,
        first_lesson: progArr.length > 0,
        first_quiz: scores.length > 0,
        first_ai_chat: false, // best effort: marked when student uses AI chat (not aggregated here)
        first_project: projs.length > 0,
      };
      const onboardingPct = Math.round((Object.values(steps).filter(Boolean).length / ONBOARDING_STEPS.length) * 100);

      const lastDates = progArr.map((p) => p.last_accessed).filter(Boolean).sort().reverse();
      return {
        id: s.id,
        name: s.name,
        college: s.college || "",
        department: s.department || "",
        modulesCompleted: completed,
        modulesInProgress: inProgress,
        quizCount: scores.length,
        avgScore: avg,
        projectSubmissions: projs.length,
        lastActivity: lastDates[0] || "",
        onboardingPct,
      };
    });

    setStudents(rows);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter((s) =>
      !q || s.name.toLowerCase().includes(q) || s.college.toLowerCase().includes(q) || s.department.toLowerCase().includes(q)
    );
  }, [students, search]);

  const openStudent = async (s: StudentRow) => {
    setSelected(s);
    setFeedbackText("");
    setCategory("general");
    const [fbRes, progRes, scoreRes, projRes] = await Promise.all([
      supabase.from("coordinator_feedback").select("*").eq("student_id", s.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("student_module_progress").select("*").eq("student_id", s.id),
      supabase.from("student_assessment_scores").select("*").eq("student_id", s.id).order("attempted_at", { ascending: false }).limit(20),
      supabase.from("student_project_progress").select("*").eq("student_name", s.name).limit(20),
    ]);
    setFeedbackHistory(fbRes.data || []);
    setDetails({ progress: progRes.data || [], scores: scoreRes.data || [], projects: projRes.data || [] });
  };

  const submitFeedback = async () => {
    if (!selected || !feedbackText.trim()) return;
    setPosting(true);
    const { error } = await supabase.from("coordinator_feedback").insert({
      student_id: selected.id,
      student_name: selected.name,
      reviewer_id: reviewerId,
      reviewer_name: reviewerName,
      reviewer_role: reviewerRole,
      category,
      feedback: feedbackText.trim(),
    });
    setPosting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Feedback saved");
    setFeedbackText("");
    openStudent(selected);
  };

  const downloadReport = () => {
    if (!selected || !details) return;
    const lines: string[] = [];
    lines.push(`STUDENT REVIEW REPORT`);
    lines.push(`====================`);
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push(`Reviewer: ${reviewerName} (${reviewerRole})`);
    lines.push(``);
    lines.push(`Student: ${selected.name}`);
    lines.push(`Institute: ${selected.college}`);
    lines.push(`Department: ${selected.department}`);
    lines.push(``);
    lines.push(`SUMMARY`);
    lines.push(`-------`);
    lines.push(`Onboarding completion: ${selected.onboardingPct}%`);
    lines.push(`Modules completed: ${selected.modulesCompleted}`);
    lines.push(`Modules in progress: ${selected.modulesInProgress}`);
    lines.push(`Quiz attempts: ${selected.quizCount} (avg ${selected.avgScore}%)`);
    lines.push(`Project submissions: ${selected.projectSubmissions}`);
    lines.push(``);
    lines.push(`QUIZ ATTEMPTS`);
    lines.push(`-------------`);
    details.scores.forEach((s: any) => {
      lines.push(`- Module ${s.module_id}: ${s.score}% (${s.correct_answers}/${s.total_questions}) on ${new Date(s.attempted_at).toLocaleDateString()}`);
    });
    if (details.scores.length === 0) lines.push(`(none)`);
    lines.push(``);
    lines.push(`PROJECT SUBMISSIONS`);
    lines.push(`-------------------`);
    details.projects.forEach((p: any) => {
      const steps = p.completed_steps ? Object.keys(p.completed_steps).length : 0;
      lines.push(`- ${p.stream_id || "Project"}: ${steps} steps completed (updated ${new Date(p.updated_at).toLocaleDateString()})`);
    });
    if (details.projects.length === 0) lines.push(`(none)`);
    lines.push(``);
    lines.push(`COORDINATOR FEEDBACK`);
    lines.push(`--------------------`);
    feedbackHistory.forEach((f: any) => {
      lines.push(`[${new Date(f.created_at).toLocaleDateString()}] (${f.category}) ${f.reviewer_name} (${f.reviewer_role}):`);
      lines.push(`  ${f.feedback}`);
      lines.push(``);
    });
    if (feedbackHistory.length === 0) lines.push(`(no feedback yet)`);

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `review-${selected.name.replace(/\s+/g, "_")}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <AIChatErrorBreakdown />
      <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-primary" /> Institute Coordinator Review
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-7 h-8 w-56" placeholder="Search students…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 px-2">Student</th>
                  <th className="py-2 px-2">Institute</th>
                  <th className="py-2 px-2 text-center">Onboarding</th>
                  <th className="py-2 px-2 text-center">Modules</th>
                  <th className="py-2 px-2 text-center">Quizzes</th>
                  <th className="py-2 px-2 text-center">Avg Score</th>
                  <th className="py-2 px-2 text-center">Projects</th>
                  <th className="py-2 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 100).map((s) => (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-2 font-medium">{s.name}</td>
                    <td className="py-2 px-2 text-xs text-muted-foreground">{s.college}<br />{s.department}</td>
                    <td className="py-2 px-2 text-center">
                      <Badge variant="outline" className={s.onboardingPct >= 80 ? "border-success text-success" : s.onboardingPct >= 50 ? "border-warning text-warning" : "border-destructive text-destructive"}>
                        {s.onboardingPct}%
                      </Badge>
                    </td>
                    <td className="py-2 px-2 text-center">{s.modulesCompleted}/{s.modulesCompleted + s.modulesInProgress}</td>
                    <td className="py-2 px-2 text-center">{s.quizCount}</td>
                    <td className="py-2 px-2 text-center">
                      <span className={s.avgScore >= 80 ? "text-success" : s.avgScore >= 60 ? "text-warning" : "text-destructive"}>{s.avgScore}%</span>
                    </td>
                    <td className="py-2 px-2 text-center">{s.projectSubmissions}</td>
                    <td className="py-2 px-2 text-right">
                      <Button size="sm" variant="ghost" onClick={() => openStudent(s)}>Review</Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">No students match your search.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.name} — Review</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded bg-muted"><p className="text-lg font-bold">{selected.onboardingPct}%</p>Onboarding</div>
                <div className="p-2 rounded bg-muted"><p className="text-lg font-bold">{selected.modulesCompleted}</p>Modules done</div>
                <div className="p-2 rounded bg-muted"><p className="text-lg font-bold">{selected.quizCount}</p>Quizzes ({selected.avgScore}%)</div>
                <div className="p-2 rounded bg-muted"><p className="text-lg font-bold">{selected.projectSubmissions}</p>Projects</div>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><FileText className="h-4 w-4" /> Add feedback</h4>
                <div className="flex gap-2 mb-2">
                  {["general", "onboarding", "quiz", "project"].map((c) => (
                    <Button key={c} size="sm" variant={category === c ? "default" : "outline"} onClick={() => setCategory(c)}>{c}</Button>
                  ))}
                </div>
                <Textarea rows={3} placeholder="Your feedback for this student…" value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} />
                <div className="flex justify-between items-center mt-2">
                  <Button variant="outline" size="sm" onClick={downloadReport}>
                    <Download className="h-3 w-3 mr-2" /> Download .txt report
                  </Button>
                  <Button size="sm" onClick={submitFeedback} disabled={posting || !feedbackText.trim()}>
                    {posting ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Send className="h-3 w-3 mr-2" />}
                    Save feedback
                  </Button>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2">Recent feedback ({feedbackHistory.length})</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {feedbackHistory.map((f: any) => (
                    <div key={f.id} className="p-2 rounded border border-border text-xs">
                      <div className="flex justify-between text-muted-foreground">
                        <span>{f.reviewer_name} · {f.reviewer_role} · <Badge variant="outline" className="text-[10px] ml-1">{f.category}</Badge></span>
                        <span>{new Date(f.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="mt-1">{f.feedback}</p>
                    </div>
                  ))}
                  {feedbackHistory.length === 0 && <p className="text-xs text-muted-foreground">No feedback yet.</p>}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default CoordinatorReview;
