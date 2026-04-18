import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { techStream, nonTechStream, mbaCaseStudyStream } from "@/data/projectGuideData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FolderKanban, Users, CheckCircle2, TrendingUp, Search, Download, Loader2 } from "lucide-react";

const STREAMS = [techStream, nonTechStream, mbaCaseStudyStream];
const streamMeta = (id: string) => STREAMS.find((s) => s.id === id);
const streamLabel = (id: string) => streamMeta(id)?.title || id || "—";
const streamSteps = (id: string) => streamMeta(id)?.stepsCount || 0;

interface ProgressRow {
  id: string;
  student_name: string;
  stream_id: string;
  project_title: string;
  completed_steps: any;
  completed_docs: any;
  github_url: string;
  updated_at: string;
}

interface StudentRow {
  id: string;
  name: string;
  college: string;
  location: string;
}

interface TrainerRow {
  id: string;
  name: string;
}

interface TrainerLinkRow {
  trainer_id: string;
  student_id: string;
}

const countCompletedSteps = (completed: any): number => {
  if (!completed) return 0;
  if (Array.isArray(completed)) return completed.filter(Boolean).length;
  if (typeof completed === "object") return Object.values(completed).filter(Boolean).length;
  return 0;
};

const ProjectsAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [students, setStudents] = useState<Record<string, StudentRow>>({});
  const [trainers, setTrainers] = useState<TrainerRow[]>([]);
  const [trainerLinks, setTrainerLinks] = useState<TrainerLinkRow[]>([]);

  const [trainerFilter, setTrainerFilter] = useState("all");
  const [instituteFilter, setInstituteFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [streamFilter, setStreamFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: pg }, { data: st }, { data: tr }, { data: ts }] = await Promise.all([
        supabase.from("student_project_progress").select("*").order("updated_at", { ascending: false }),
        supabase.from("students").select("id, name, college, location"),
        supabase.from("trainers").select("id, name"),
        supabase.from("trainer_students").select("trainer_id, student_id"),
      ]);
      setProgress((pg as ProgressRow[]) || []);
      const map: Record<string, StudentRow> = {};
      (st as StudentRow[] || []).forEach((s) => { map[s.name] = s; });
      setStudents(map);
      setTrainers((tr as TrainerRow[]) || []);
      setTrainerLinks((ts as TrainerLinkRow[]) || []);
      setLoading(false);
    })();
  }, []);

  // Trainer -> student name lookup
  const studentToTrainerName = useMemo(() => {
    const trainerById: Record<string, string> = {};
    trainers.forEach((t) => { trainerById[t.id] = t.name; });
    const studentNameByTrainer: Record<string, string> = {};
    trainerLinks.forEach((link) => {
      // student_id in trainer_students references students.id (uuid). Find name via reverse map.
      const student = Object.values(students).find((s) => s.id === link.student_id);
      if (student) studentNameByTrainer[student.name] = trainerById[link.trainer_id] || "—";
    });
    return studentNameByTrainer;
  }, [trainers, trainerLinks, students]);

  // Build enriched rows
  const enriched = useMemo(() => {
    return progress.map((p) => {
      const s = students[p.student_name];
      const completed = countCompletedSteps(p.completed_steps);
      const total = streamSteps(p.stream_id) || Math.max(completed, 1);
      const pct = Math.min(100, Math.round((completed / Math.max(total, 1)) * 100));
      return {
        ...p,
        institute: s?.college || "—",
        location: s?.location || "—",
        trainer: studentToTrainerName[p.student_name] || "—",
        completedCount: completed,
        totalSteps: total,
        pct,
      };
    });
  }, [progress, students, studentToTrainerName]);

  // Filter options
  const institutes = useMemo(() => Array.from(new Set(enriched.map((e) => e.institute).filter((x) => x && x !== "—"))).sort(), [enriched]);
  const locations = useMemo(() => Array.from(new Set(enriched.map((e) => e.location).filter((x) => x && x !== "—"))).sort(), [enriched]);

  const filtered = useMemo(() => {
    return enriched.filter((e) => {
      if (trainerFilter !== "all" && e.trainer !== trainerFilter) return false;
      if (instituteFilter !== "all" && e.institute !== instituteFilter) return false;
      if (locationFilter !== "all" && e.location !== locationFilter) return false;
      if (streamFilter !== "all" && e.stream_id !== streamFilter) return false;
      if (search && !e.student_name.toLowerCase().includes(search.toLowerCase()) && !e.project_title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [enriched, trainerFilter, instituteFilter, locationFilter, streamFilter, search]);

  // KPIs
  const kpis = useMemo(() => {
    const total = filtered.length;
    const completed = filtered.filter((e) => e.pct === 100).length;
    const inProgress = filtered.filter((e) => e.pct > 0 && e.pct < 100).length;
    const avg = total ? Math.round(filtered.reduce((s, e) => s + e.pct, 0) / total) : 0;
    return { total, completed, inProgress, avg };
  }, [filtered]);

  // Stage breakdown by stream
  const stageBreakdown = useMemo(() => {
    const map: Record<string, { stream_id: string; total: number; perStep: number[] }> = {};
    filtered.forEach((e) => {
      const totalSteps = streamSteps(e.stream_id);
      if (!totalSteps) return;
      if (!map[e.stream_id]) map[e.stream_id] = { stream_id: e.stream_id, total: 0, perStep: Array(totalSteps).fill(0) };
      map[e.stream_id].total += 1;
      const completedArr: boolean[] = Array.isArray(e.completed_steps)
        ? e.completed_steps
        : Object.values(e.completed_steps || {}) as boolean[];
      for (let i = 0; i < totalSteps; i++) {
        if (completedArr[i]) map[e.stream_id].perStep[i] += 1;
      }
    });
    return Object.values(map);
  }, [filtered]);

  const exportCSV = () => {
    const header = ["Student", "Institute", "Location", "Trainer", "Stream", "Project", "Completed Steps", "Total Steps", "% Complete", "Updated"];
    const rows = filtered.map((e) => [
      e.student_name, e.institute, e.location, e.trainer,
      streamLabel(e.stream_id), e.project_title || "—",
      e.completedCount, e.totalSteps, `${e.pct}%`,
      new Date(e.updated_at).toLocaleString(),
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `projects-analytics-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-muted-foreground p-6"><Loader2 className="h-4 w-4 animate-spin" /> Loading project analytics…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-display font-bold flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-primary" /> Projects Analytics
          </h2>
          <p className="text-sm text-muted-foreground">Stage-wise completion across students, with Trainer / Institute / Location filters.</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Users className="h-5 w-5 text-primary" /><div><div className="text-2xl font-bold">{kpis.total}</div><div className="text-xs text-muted-foreground">Students</div></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-success" /><div><div className="text-2xl font-bold">{kpis.completed}</div><div className="text-xs text-muted-foreground">Completed</div></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><TrendingUp className="h-5 w-5 text-warning" /><div><div className="text-2xl font-bold">{kpis.inProgress}</div><div className="text-xs text-muted-foreground">In Progress</div></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div><div className="text-2xl font-bold">{kpis.avg}%</div><div className="text-xs text-muted-foreground">Avg. Completion</div></div></CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
          <Select value={trainerFilter} onValueChange={setTrainerFilter}>
            <SelectTrigger><SelectValue placeholder="Trainer" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trainers</SelectItem>
              {trainers.map((t) => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={instituteFilter} onValueChange={setInstituteFilter}>
            <SelectTrigger><SelectValue placeholder="Institute" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Institutes</SelectItem>
              {institutes.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger><SelectValue placeholder="Location" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={streamFilter} onValueChange={setStreamFilter}>
            <SelectTrigger><SelectValue placeholder="Stream" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Streams</SelectItem>
              {STREAMS.map((s) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search student/project" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
          </div>
        </CardContent>
      </Card>

      {/* Stage breakdown per stream */}
      {stageBreakdown.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Stage-wise Completion</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {stageBreakdown.map((sb) => {
              const meta = streamMeta(sb.stream_id);
              return (
                <div key={sb.stream_id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">{meta?.title || sb.stream_id}</div>
                    <Badge variant="outline">{sb.total} student{sb.total !== 1 ? "s" : ""}</Badge>
                  </div>
                  <div className="space-y-2">
                    {sb.perStep.map((count, idx) => {
                      const pct = sb.total ? Math.round((count / sb.total) * 100) : 0;
                      const stepTitle = meta?.steps[idx]?.title || `Step ${idx + 1}`;
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Step {idx + 1}: {stepTitle}</span>
                            <span className="font-medium">{count}/{sb.total} ({pct}%)</span>
                          </div>
                          <Progress value={pct} className="h-1.5" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Student table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Students ({filtered.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Institute</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Trainer</TableHead>
                  <TableHead>Stream</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead className="w-[200px]">Completion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No projects match the current filters.</TableCell></TableRow>
                ) : filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.student_name}</TableCell>
                    <TableCell className="text-sm">{e.institute}</TableCell>
                    <TableCell className="text-sm">{e.location}</TableCell>
                    <TableCell className="text-sm">{e.trainer}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px]">{streamLabel(e.stream_id)}</Badge></TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{e.project_title || "—"}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span>{e.completedCount}/{e.totalSteps} steps</span>
                          <span className="font-medium">{e.pct}%</span>
                        </div>
                        <Progress value={e.pct} className="h-1.5" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectsAnalytics;
