import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, BarChart3, AlertTriangle, CheckCircle2, FileText, Download, MessageSquare, FileSpreadsheet, FileDown, History as HistoryIcon } from "lucide-react";
import { toast } from "sonner";
import SubmissionHistoryDialog from "./SubmissionHistoryDialog";

interface Props {
  ownerRole: "trainer" | "admin";
  ownerId: string;
  ownerName: string;
  ownerCollege: string;
}

type Curriculum = { id: string; title: string; owner_role: string; owner_id: string; owner_college: string };
type Assignment = { id: string; curriculum_id: string; scope_type: string; college: string; department: string; degree: string; student_id: string | null; due_date: string | null; status: string };
type Submission = {
  id: string; curriculum_id: string; student_id: string; student_name: string;
  student_college: string; student_department: string; student_degree: string;
  attachment_url: string; attachment_name: string; notes: string;
  trainer_feedback: string; score: number | null; max_score: number | null;
  status: string; reviewed_at: string | null; updated_at: string; created_at: string;
  revision_message?: string; revision_due_date?: string | null;
};
type Student = { id: string; name: string; college: string; department: string; degree: string };

function lc(s: string | null | undefined) { return (s || "").toLowerCase(); }

function studentMatchesAssignment(stu: Student, a: Assignment): boolean {
  if (a.scope_type === "student") return a.student_id === stu.id;
  const okC = !a.college || lc(a.college) === lc(stu.college);
  const okD = !a.department || lc(a.department) === lc(stu.department);
  const okG = !a.degree || lc(a.degree) === lc(stu.degree);
  return okC && okD && okG;
}

export default function CurriculumAssignmentAnalytics({ ownerRole, ownerId, ownerName, ownerCollege }: Props) {
  const [loading, setLoading] = useState(true);
  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedCurriculum, setSelectedCurriculum] = useState<string>("all");
  const [reviewing, setReviewing] = useState<Submission | null>(null);
  const [fDept, setFDept] = useState<string>("all");
  const [fDegree, setFDegree] = useState<string>("all");
  const [fStatus, setFStatus] = useState<string>("all");
  const [fFrom, setFFrom] = useState<string>("");
  const [fTo, setFTo] = useState<string>("");
  const [fSearch, setFSearch] = useState<string>("");

  const reload = async () => {
    setLoading(true);
    let cq = supabase.from("trainer_curricula").select("*");
    if (ownerRole === "trainer") cq = cq.eq("owner_role", "trainer").eq("owner_id", ownerId);
    const [{ data: cData }, { data: stuData }] = await Promise.all([
      cq,
      supabase.from("students").select("id, name, college, department, degree"),
    ]);
    const cur = (cData as Curriculum[]) || [];
    setCurricula(cur);
    setStudents((stuData as Student[]) || []);
    const cIds = cur.map((c) => c.id);
    if (cIds.length === 0) {
      setAssignments([]); setSubmissions([]); setLoading(false); return;
    }
    const [{ data: aData }, { data: sData }] = await Promise.all([
      supabase.from("curriculum_assignments").select("*").in("curriculum_id", cIds),
      supabase.from("curriculum_submissions").select("*").in("curriculum_id", cIds),
    ]);
    setAssignments((aData as Assignment[]) || []);
    setSubmissions((sData as Submission[]) || []);
    setLoading(false);
  };

  useEffect(() => { reload(); }, [ownerRole, ownerId]);

  const scoped = useMemo(() => {
    const cur = selectedCurriculum === "all" ? curricula : curricula.filter((c) => c.id === selectedCurriculum);
    const cIds = new Set(cur.map((c) => c.id));
    return {
      curricula: cur,
      assignments: assignments.filter((a) => cIds.has(a.curriculum_id)),
      submissions: submissions.filter((s) => cIds.has(s.curriculum_id)),
    };
  }, [curricula, assignments, submissions, selectedCurriculum]);

  // Build per-(curriculum, student) expected submissions based on assignment scope rules
  const rows = useMemo(() => {
    const out: Array<{
      curriculum: Curriculum;
      student: Student;
      assignment: Assignment;
      submission: Submission | null;
      isOverdue: boolean;
    }> = [];
    for (const c of scoped.curricula) {
      const rules = scoped.assignments.filter((a) => a.curriculum_id === c.id);
      const eligibleStudents = new Map<string, { stu: Student; assign: Assignment }>();
      if (rules.length === 0) {
        if (c.owner_college) {
          for (const s of students) {
            if (lc(s.college) === lc(c.owner_college)) {
              eligibleStudents.set(s.id, { stu: s, assign: { id: "", curriculum_id: c.id, scope_type: "default", college: c.owner_college, department: "", degree: "", student_id: null, due_date: null, status: "active" } });
            }
          }
        }
      } else {
        for (const a of rules) {
          for (const s of students) {
            if (studentMatchesAssignment(s, a)) {
              const existing = eligibleStudents.get(s.id);
              // prefer earliest due date assignment
              if (!existing) eligibleStudents.set(s.id, { stu: s, assign: a });
              else {
                const ed = existing.assign.due_date ? new Date(existing.assign.due_date).getTime() : Number.MAX_SAFE_INTEGER;
                const nd = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
                if (nd < ed) eligibleStudents.set(s.id, { stu: s, assign: a });
              }
            }
          }
        }
      }
      const now = new Date();
      for (const { stu, assign } of eligibleStudents.values()) {
        const sub = scoped.submissions.find((x) => x.curriculum_id === c.id && x.student_id === stu.id) || null;
        const isOverdue = !sub && !!assign.due_date && new Date(assign.due_date) < now;
        out.push({ curriculum: c, student: stu, assignment: assign, submission: sub, isOverdue });
      }
    }
    return out;
  }, [scoped, students]);

  const departments = useMemo(() => Array.from(new Set(rows.map(r => r.student.department).filter(Boolean))).sort(), [rows]);
  const degrees = useMemo(() => Array.from(new Set(rows.map(r => r.student.degree).filter(Boolean))).sort(), [rows]);

  const filteredRows = useMemo(() => {
    const fromTs = fFrom ? new Date(fFrom).getTime() : null;
    const toTs = fTo ? new Date(fTo).getTime() + 86399999 : null;
    const q = fSearch.trim().toLowerCase();
    return rows.filter(r => {
      if (fDept !== "all" && lc(r.student.department) !== lc(fDept)) return false;
      if (fDegree !== "all" && lc(r.student.degree) !== lc(fDegree)) return false;
      if (fStatus !== "all") {
        const s = r.submission?.status || (r.isOverdue ? "overdue" : "pending");
        if (s !== fStatus) return false;
      }
      const dueTs = r.assignment?.due_date ? new Date(r.assignment.due_date).getTime() : null;
      if (fromTs !== null && (dueTs === null || dueTs < fromTs)) return false;
      if (toTs !== null && (dueTs === null || dueTs > toTs)) return false;
      if (q && !r.student.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, fDept, fDegree, fStatus, fFrom, fTo, fSearch]);

  const stats = useMemo(() => {
    const rows = filteredRows;
    const total = rows.length;
    const completed = rows.filter((r) => r.submission).length;
    const overdue = rows.filter((r) => r.isOverdue).length;
    const scores = rows.map((r) => r.submission?.score).filter((v): v is number => typeof v === "number");
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const completionRate = total ? Math.round((completed / total) * 100) : 0;

    const byKey = (key: "student_department" | "student_degree") => {
      const map = new Map<string, { total: number; completed: number; overdue: number; scores: number[] }>();
      for (const r of rows) {
        const k = (key === "student_department" ? r.student.department : r.student.degree) || "Unspecified";
        const o = map.get(k) || { total: 0, completed: 0, overdue: 0, scores: [] };
        o.total += 1;
        if (r.submission) {
          o.completed += 1;
          if (typeof r.submission.score === "number") o.scores.push(r.submission.score);
        }
        if (r.isOverdue) o.overdue += 1;
        map.set(k, o);
      }
      return Array.from(map.entries()).map(([k, v]) => ({
        key: k, total: v.total, completed: v.completed, overdue: v.overdue,
        completionRate: v.total ? Math.round((v.completed / v.total) * 100) : 0,
        avgScore: v.scores.length ? Math.round(v.scores.reduce((a, b) => a + b, 0) / v.scores.length) : null,
      })).sort((a, b) => b.total - a.total);
    };

    return { total, completed, overdue, avgScore, completionRate, byDepartment: byKey("student_department"), byDegree: byKey("student_degree") };
  }, [filteredRows]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (curricula.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-muted-foreground">
          <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
          No curricula found. Create one in the Curriculum Builder to start tracking assignments.
        </CardContent>
      </Card>
    );
  }

  const exportCSV = () => {
    const lines: string[] = [];
    lines.push("Curriculum Assignment Analytics");
    lines.push(`Generated,${new Date().toLocaleString()}`);
    lines.push("");
    lines.push("Summary");
    lines.push("Eligible,Completed,Completion %,Overdue,Average Score");
    lines.push(`${stats.total},${stats.completed},${stats.completionRate}%,${stats.overdue},${stats.avgScore ?? "—"}`);
    const writeBreakdown = (title: string, list: any[]) => {
      lines.push(""); lines.push(title);
      lines.push("Group,Eligible,Completed,Completion %,Overdue,Avg Score");
      for (const r of list) lines.push(`"${r.key}",${r.total},${r.completed},${r.completionRate}%,${r.overdue},${r.avgScore ?? "—"}`);
    };
    writeBreakdown("By Department", stats.byDepartment);
    writeBreakdown("By Degree", stats.byDegree);
    lines.push(""); lines.push("Submissions");
    lines.push("Student,Curriculum,Department,Degree,Status,Score,Max,Reviewed At");
    for (const r of filteredRows) {
      const s = r.submission;
      const status = s ? s.status : (r.isOverdue ? "overdue" : "pending");
      lines.push(`"${r.student.name}","${r.curriculum.title}","${r.student.department || ""}","${r.student.degree || ""}",${status},${s?.score ?? ""},${s?.max_score ?? ""},${s?.reviewed_at ?? ""}`);
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `curriculum-analytics-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const exportPDF = async () => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Curriculum Assignment Analytics", 14, 16);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
      doc.text(`Curriculum filter: ${selectedCurriculum === "all" ? "All curricula" : (curricula.find(c => c.id === selectedCurriculum)?.title || "—")}`, 14, 27);

      autoTable(doc, {
        startY: 32,
        head: [["Eligible", "Completed", "Completion %", "Overdue", "Avg Score"]],
        body: [[String(stats.total), String(stats.completed), `${stats.completionRate}%`, String(stats.overdue), stats.avgScore != null ? String(stats.avgScore) : "—"]],
        styles: { fontSize: 9 }, headStyles: { fillColor: [59, 130, 246] },
      });

      autoTable(doc, {
        head: [["Department", "Eligible", "Completed", "Completion %", "Overdue", "Avg Score"]],
        body: stats.byDepartment.map((r: any) => [r.key, r.total, r.completed, `${r.completionRate}%`, r.overdue, r.avgScore ?? "—"]),
        styles: { fontSize: 9 }, headStyles: { fillColor: [99, 102, 241] },
      });
      autoTable(doc, {
        head: [["Degree", "Eligible", "Completed", "Completion %", "Overdue", "Avg Score"]],
        body: stats.byDegree.map((r: any) => [r.key, r.total, r.completed, `${r.completionRate}%`, r.overdue, r.avgScore ?? "—"]),
        styles: { fontSize: 9 }, headStyles: { fillColor: [168, 85, 247] },
      });

      doc.save(`curriculum-analytics-${Date.now()}.pdf`);
      toast.success("PDF exported");
    } catch (e: any) {
      toast.error(e.message || "PDF export failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> Assignment Analytics</h2>
          <p className="text-sm text-muted-foreground">Completion rate, average scores, and overdue submissions across your curricula.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={selectedCurriculum} onChange={(e) => setSelectedCurriculum(e.target.value)}>
            <option value="all">All curricula ({curricula.length})</option>
            {curricula.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <Button size="sm" variant="outline" className="gap-1" onClick={exportCSV}><FileSpreadsheet className="h-3 w-3" /> CSV</Button>
          <Button size="sm" variant="outline" className="gap-1" onClick={exportPDF}><FileDown className="h-3 w-3" /> PDF</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          <Input placeholder="Search student name…" value={fSearch} onChange={(e) => setFSearch(e.target.value)} className="h-9" />
          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={fDept} onChange={(e) => setFDept(e.target.value)}>
            <option value="all">All departments</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={fDegree} onChange={(e) => setFDegree(e.target.value)}>
            <option value="all">All degrees</option>
            {degrees.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
            <option value="submitted">Submitted</option>
            <option value="reviewed">Reviewed</option>
            <option value="graded">Graded</option>
            <option value="returned">Returned</option>
          </select>
          <Input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} className="h-9" title="Due from" />
          <div className="flex gap-2">
            <Input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} className="h-9" title="Due to" />
            {(fSearch || fDept !== "all" || fDegree !== "all" || fStatus !== "all" || fFrom || fTo) && (
              <Button size="sm" variant="ghost" onClick={() => { setFSearch(""); setFDept("all"); setFDegree("all"); setFStatus("all"); setFFrom(""); setFTo(""); }}>Clear</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Eligible students" value={stats.total} />
        <StatCard label="Completed" value={stats.completed} sub={`${stats.completionRate}%`} tone="success" />
        <StatCard label="Overdue" value={stats.overdue} tone="destructive" />
        <StatCard label="Average score" value={stats.avgScore != null ? `${stats.avgScore}` : "—"} />
      </div>

      <Tabs defaultValue="department">
        <TabsList>
          <TabsTrigger value="department">By Department</TabsTrigger>
          <TabsTrigger value="degree">By Degree</TabsTrigger>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
        </TabsList>
        <TabsContent value="department">
          <BreakdownTable rows={stats.byDepartment} keyLabel="Department" />
        </TabsContent>
        <TabsContent value="degree">
          <BreakdownTable rows={stats.byDegree} keyLabel="Degree" />
        </TabsContent>
        <TabsContent value="submissions">
          <Card>
            <CardHeader><CardTitle className="text-base">Student submissions</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Curriculum</TableHead>
                    <TableHead>Dept / Degree</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Attachment</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No eligible students match the current filters.</TableCell></TableRow>
                  )}
                  {filteredRows.map((r, i) => {
                    const s = r.submission;
                    return (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{r.student.name}</TableCell>
                        <TableCell className="text-xs">{r.curriculum.title}</TableCell>
                        <TableCell className="text-xs">{r.student.department || "—"} / {r.student.degree || "—"}</TableCell>
                        <TableCell>
                          {s ? (
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 gap-1"><CheckCircle2 className="h-3 w-3" />{s.status}</Badge>
                          ) : r.isOverdue ? (
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 gap-1"><AlertTriangle className="h-3 w-3" />Overdue</Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell>{s?.score ?? "—"}</TableCell>
                        <TableCell>
                          {s?.attachment_url ? (
                            <a href={s.attachment_url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs flex items-center gap-1"><Download className="h-3 w-3" />{s.attachment_name || "file"}</a>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {s ? (
                            <Button size="sm" variant="outline" className="gap-1" onClick={() => setReviewing(s)}>
                              <MessageSquare className="h-3 w-3" /> Review
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ReviewDialog
        submission={reviewing}
        reviewerId={ownerId}
        reviewerName={ownerName}
        onClose={() => setReviewing(null)}
        onSaved={async () => { setReviewing(null); await reload(); }}
      />
    </div>
  );
}

function StatCard({ label, value, sub, tone }: { label: string; value: any; sub?: string; tone?: "success" | "destructive" }) {
  const toneClass = tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-2xl font-bold ${toneClass}`}>{value}{sub && <span className="text-sm ml-2 text-muted-foreground">{sub}</span>}</div>
      </CardContent>
    </Card>
  );
}

function BreakdownTable({ rows, keyLabel }: { rows: any[]; keyLabel: string }) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{keyLabel}</TableHead>
              <TableHead>Eligible</TableHead>
              <TableHead>Completed</TableHead>
              <TableHead>Completion %</TableHead>
              <TableHead>Overdue</TableHead>
              <TableHead>Avg score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No data yet.</TableCell></TableRow>}
            {rows.map((r) => (
              <TableRow key={r.key}>
                <TableCell className="font-medium">{r.key}</TableCell>
                <TableCell>{r.total}</TableCell>
                <TableCell>{r.completed}</TableCell>
                <TableCell><Badge variant="outline" className={r.completionRate >= 70 ? "bg-success/10 text-success border-success/30" : r.completionRate >= 40 ? "bg-warning/10 text-warning border-warning/30" : "bg-destructive/10 text-destructive border-destructive/30"}>{r.completionRate}%</Badge></TableCell>
                <TableCell>{r.overdue > 0 ? <span className="text-destructive font-medium">{r.overdue}</span> : 0}</TableCell>
                <TableCell>{r.avgScore != null ? r.avgScore : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ReviewDialog({ submission, reviewerId, reviewerName, onClose, onSaved }: {
  submission: Submission | null; reviewerId: string; reviewerName: string; onClose: () => void; onSaved: () => void | Promise<void>;
}) {
  const [feedback, setFeedback] = useState("");
  const [score, setScore] = useState<string>("");
  const [maxScore, setMaxScore] = useState<string>("");
  const [status, setStatus] = useState<string>("reviewed");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (submission) {
      setFeedback(submission.trainer_feedback || "");
      setScore(submission.score != null ? String(submission.score) : "");
      setMaxScore(submission.max_score != null ? String(submission.max_score) : "100");
      setStatus(submission.status === "submitted" ? "reviewed" : submission.status);
    }
  }, [submission]);

  if (!submission) return null;

  const save = async () => {
    setSaving(true);
    try {
      const update: any = {
        trainer_feedback: feedback,
        status,
        reviewed_by: reviewerId,
        reviewed_by_name: reviewerName,
        reviewed_at: new Date().toISOString(),
      };
      if (score.trim() !== "") update.score = Number(score);
      if (maxScore.trim() !== "") update.max_score = Number(maxScore);
      const { error } = await supabase.from("curriculum_submissions").update(update).eq("id", submission.id);
      if (error) throw error;
      toast.success("Feedback saved");
      await onSaved();
    } catch (e: any) {
      toast.error(e.message || "Failed to save feedback");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!submission} onOpenChange={(b) => !b && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Review — {submission.student_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          {submission.notes && (
            <div>
              <div className="text-xs font-medium text-muted-foreground">Student notes</div>
              <p className="whitespace-pre-wrap text-xs bg-muted/30 rounded p-2">{submission.notes}</p>
            </div>
          )}
          {submission.attachment_url && (
            <a href={submission.attachment_url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-xs flex items-center gap-1"><FileText className="h-3 w-3" />{submission.attachment_name || "Open attachment"}</a>
          )}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Feedback notes</label>
            <Textarea rows={4} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Provide guidance, corrections, or praise…" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Score</label>
              <Input type="number" value={score} onChange={(e) => setScore(e.target.value)} placeholder="e.g. 85" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Max score</label>
              <Input type="number" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} placeholder="100" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <select className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="reviewed">Reviewed</option>
                <option value="graded">Graded</option>
                <option value="returned">Returned for revision</option>
                <option value="submitted">Submitted</option>
              </select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
