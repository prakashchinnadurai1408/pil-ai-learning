import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Activity, GitCompare, Paperclip, MessageSquare, Users, Pin, RotateCcw, StickyNote, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";

interface HistoryRow {
  id: string;
  submission_id: string;
  curriculum_id: string;
  student_id: string;
  student_name?: string | null;
  version_number: number | null;
  kind: string;
  attachment_name: string;
  trainer_feedback: string;
  notes: string;
  status: string;
  actor_role: string;
  actor_name: string;
  created_at: string;
}

interface Props {
  studentIds: string[];
  studentNameById: Record<string, string>;
  trainerId?: string;
  trainerName?: string;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--destructive))", "hsl(var(--accent))"];
const ALL = "__all__";
const countAtts = (s: string) => (s ? s.split(/[\n,|]+/).map((t) => t.trim()).filter(Boolean).length : 0);
const PIN_KEY = (tid: string) => `diffPins:${tid || "anon"}`;

const loadPins = (tid: string): Record<string, string> => {
  try { return JSON.parse(localStorage.getItem(PIN_KEY(tid)) || "{}"); } catch { return {}; }
};

const TrainerDiffAnalytics = ({ studentIds, studentNameById, trainerId = "", trainerName = "Trainer" }: Props) => {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [subs, setSubs] = useState<Record<string, { curriculum_id: string; student_id: string; student_name: string }>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [days, setDays] = useState<7 | 14 | 30>(14);
  const [fCurriculum, setFCurriculum] = useState<string>(ALL);
  const [fStudent, setFStudent] = useState<string>(ALL);
  const [fStatus, setFStatus] = useState<string>(ALL);
  const [fActorRole, setFActorRole] = useState<string>(ALL);
  const [pins, setPins] = useState<Record<string, string>>(() => loadPins(trainerId));
  const [noteFor, setNoteFor] = useState<HistoryRow | null>(null);
  const [noteText, setNoteText] = useState("");
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const sidsKey = studentIds.join(",");

  const fetchRows = useCallback(async () => {
    setLoading(true);
    if (studentIds.length === 0) { setRows([]); setSubs({}); setLoading(false); return; }
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const { data: hist } = await supabase
      .from("curriculum_submission_history")
      .select("*")
      .in("student_id", studentIds)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(2000);
    const subIds = Array.from(new Set((hist || []).map((r: any) => r.submission_id).filter(Boolean)));
    const subMap: Record<string, any> = {};
    if (subIds.length) {
      const { data: subRows } = await supabase
        .from("curriculum_submissions")
        .select("id, curriculum_id, student_id, student_name")
        .in("id", subIds);
      (subRows || []).forEach((s: any) => { subMap[s.id] = s; });
    }
    setSubs(subMap);
    setRows((hist as any[]) || []);
    setLoading(false);
  }, [sidsKey, days]);

  useEffect(() => { let active = true; (async () => { await fetchRows(); if (!active) return; })(); return () => { active = false; }; }, [fetchRows]);

  const enriched = useMemo(() => rows.map((r) => ({
    ...r,
    student_name: r.student_name || studentNameById[r.student_id] || subs[r.submission_id]?.student_name || "Student",
    attCount: countAtts(r.attachment_name),
    fbLen: (r.trainer_feedback || "").length,
    notesLen: (r.notes || "").length,
    pinned: !!pins[r.id],
  })), [rows, subs, studentNameById, pins]);

  const curriculumOptions = useMemo(() => Array.from(new Set(enriched.map((r) => r.curriculum_id).filter(Boolean))).slice(0, 100), [enriched]);
  const studentOptions = useMemo(() => {
    const m = new Map<string, string>();
    enriched.forEach((r) => m.set(r.student_id, r.student_name));
    return Array.from(m.entries());
  }, [enriched]);
  const statusOptions = useMemo(() => Array.from(new Set(enriched.map((r) => (r.status || "").toLowerCase()).filter(Boolean))), [enriched]);
  const actorRoleOptions = useMemo(() => Array.from(new Set(enriched.map((r) => (r.actor_role || "").toLowerCase()).filter(Boolean))), [enriched]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter((r) => {
      if (fCurriculum !== ALL && r.curriculum_id !== fCurriculum) return false;
      if (fStudent !== ALL && r.student_id !== fStudent) return false;
      if (fStatus !== ALL && (r.status || "").toLowerCase() !== fStatus) return false;
      if (fActorRole !== ALL && (r.actor_role || "").toLowerCase() !== fActorRole) return false;
      if (!q) return true;
      return (
        r.student_name.toLowerCase().includes(q) ||
        (r.attachment_name || "").toLowerCase().includes(q) ||
        (r.actor_name || "").toLowerCase().includes(q) ||
        (r.curriculum_id || "").toLowerCase().includes(q) ||
        (r.notes || "").toLowerCase().includes(q)
      );
    });
  }, [enriched, search, fCurriculum, fStudent, fStatus, fActorRole]);

  const counters = useMemo(() => {
    const total = filtered.length;
    const studentSubs = filtered.filter((r) => r.kind === "student_submission").length;
    const trainerEvents = total - studentSubs;
    const uniqStudents = new Set(filtered.map((r) => r.student_id)).size;
    const uniqCurricula = new Set(filtered.map((r) => r.curriculum_id)).size;
    const totalAtts = filtered.reduce((a, r) => a + r.attCount, 0);
    const pinnedCount = filtered.filter((r) => r.pinned).length;
    return { total, studentSubs, trainerEvents, uniqStudents, uniqCurricula, totalAtts, pinnedCount };
  }, [filtered]);

  const topStudents = useMemo(() => {
    const m = new Map<string, { name: string; revisions: number; submissions: number }>();
    filtered.forEach((r) => {
      const cur = m.get(r.student_id) || { name: r.student_name, revisions: 0, submissions: 0 };
      if (r.kind === "student_submission") cur.submissions += 1; else cur.revisions += 1;
      m.set(r.student_id, cur);
    });
    return Array.from(m.values())
      .sort((a, b) => (b.revisions + b.submissions) - (a.revisions + a.submissions))
      .slice(0, 8);
  }, [filtered]);

  const timeline = useMemo(() => {
    const buckets = new Map<string, { day: string; submissions: number; revisions: number; attachments: number; trainerActions: number; pinned: number }>();
    filtered.forEach((r) => {
      const day = r.created_at.slice(0, 10);
      const cur = buckets.get(day) || { day, submissions: 0, revisions: 0, attachments: 0, trainerActions: 0, pinned: 0 };
      if (r.kind === "student_submission") cur.submissions += 1; else cur.revisions += 1;
      if (r.kind === "trainer_note" || r.kind === "revision_requested") cur.trainerActions += 1;
      if (r.pinned) cur.pinned += 1;
      cur.attachments += r.attCount;
      buckets.set(day, cur);
    });
    return Array.from(buckets.values()).sort((a, b) => a.day.localeCompare(b.day));
  }, [filtered]);

  const statusBreakdown = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach((r) => { const k = (r.status || "unknown").toLowerCase(); m.set(k, (m.get(k) || 0) + 1); });
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const topChurn = useMemo(() => {
    const m = new Map<string, { curriculum_id: string; events: number; atts: number; fbLen: number; students: Set<string> }>();
    filtered.forEach((r) => {
      const cur = m.get(r.curriculum_id) || { curriculum_id: r.curriculum_id, events: 0, atts: 0, fbLen: 0, students: new Set() };
      cur.events += 1; cur.atts += r.attCount; cur.fbLen += r.fbLen; cur.students.add(r.student_id);
      m.set(r.curriculum_id, cur);
    });
    return Array.from(m.values()).map((c) => ({ ...c, studentCount: c.students.size })).sort((a, b) => b.events - a.events).slice(0, 6);
  }, [filtered]);

  const recent = filtered.slice(0, 20);

  const togglePin = (r: HistoryRow) => {
    setPins((prev) => {
      const next = { ...prev };
      if (next[r.id]) { delete next[r.id]; toast.success("Unpinned"); }
      else { next[r.id] = `${r.student_id}|${new Date().toISOString()}`; toast.success(`Pinned to ${r.student_name || "student"}`); }
      try { localStorage.setItem(PIN_KEY(trainerId), JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const requestResubmission = async (r: any) => {
    if (!r.submission_id) { toast.error("No submission linked"); return; }
    setActionBusy(r.id);
    const { error: upErr } = await supabase
      .from("curriculum_submissions")
      .update({ status: "revision_requested", reviewed_by: trainerId, reviewed_by_name: trainerName, reviewed_at: new Date().toISOString() })
      .eq("id", r.submission_id);
    if (upErr) { toast.error("Failed to update submission"); setActionBusy(null); return; }
    await supabase.from("curriculum_submission_history").insert({
      submission_id: r.submission_id,
      curriculum_id: r.curriculum_id,
      student_id: r.student_id,
      kind: "revision_requested",
      status: "revision_requested",
      revision_message: "Trainer requested a fresh revision from analytics view.",
      actor_id: trainerId,
      actor_name: trainerName,
      actor_role: "trainer",
    });
    toast.success("Resubmission requested");
    setActionBusy(null);
    fetchRows();
  };

  const submitNote = async () => {
    if (!noteFor || !noteText.trim()) return;
    setActionBusy(noteFor.id);
    await supabase.from("curriculum_submission_history").insert({
      submission_id: noteFor.submission_id,
      curriculum_id: noteFor.curriculum_id,
      student_id: noteFor.student_id,
      kind: "trainer_note",
      status: noteFor.status || "",
      notes: noteText.trim(),
      trainer_feedback: noteText.trim(),
      actor_id: trainerId,
      actor_name: trainerName,
      actor_role: "trainer",
    });
    toast.success("Note added to history");
    setActionBusy(null);
    setNoteFor(null);
    setNoteText("");
    fetchRows();
  };

  const clearFilters = () => {
    setSearch(""); setFCurriculum(ALL); setFStudent(ALL); setFStatus(ALL); setFActorRole(ALL);
  };
  const hasFilters = search || fCurriculum !== ALL || fStudent !== ALL || fStatus !== ALL || fActorRole !== ALL;

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (rows.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-12 text-center">
        <GitCompare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-display font-semibold text-card-foreground">No submission diffs in last {days} days</h3>
        <p className="text-sm text-muted-foreground mt-1">Try expanding the time window above, or wait for student activity.</p>
        <div className="flex justify-center gap-1 mt-4">
          {([7, 14, 30] as const).map((d) => (
            <Button key={d} size="sm" variant={days === d ? "default" : "outline"} onClick={() => setDays(d)}>{d}d</Button>
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    { label: "History Events", value: counters.total, icon: Activity, color: "text-primary" },
    { label: "Student Submissions", value: counters.studentSubs, icon: GitCompare, color: "text-success" },
    { label: "Trainer / Revision Events", value: counters.trainerEvents, icon: MessageSquare, color: "text-warning" },
    { label: "Active Students", value: counters.uniqStudents, icon: Users, color: "text-accent" },
    { label: "Curricula Touched", value: counters.uniqCurricula, icon: GitCompare, color: "text-primary" },
    { label: "Pinned", value: counters.pinnedCount, icon: Pin, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-[220px]" />
        <Select value={fCurriculum} onValueChange={setFCurriculum}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Curriculum" /></SelectTrigger>
          <SelectContent><SelectItem value={ALL}>All curricula</SelectItem>
            {curriculumOptions.map((c) => <SelectItem key={c} value={c}>{c.slice(0, 8)}…</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fStudent} onValueChange={setFStudent}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Student" /></SelectTrigger>
          <SelectContent><SelectItem value={ALL}>All students</SelectItem>
            {studentOptions.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fStatus} onValueChange={setFStatus}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value={ALL}>All status</SelectItem>
            {statusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fActorRole} onValueChange={setFActorRole}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Actor role" /></SelectTrigger>
          <SelectContent><SelectItem value={ALL}>All actors</SelectItem>
            {actorRoleOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          {([7, 14, 30] as const).map((d) => (
            <Button key={d} size="sm" variant={days === d ? "default" : "outline"} onClick={() => setDays(d)}>{d}d</Button>
          ))}
        </div>
        {hasFilters && (
          <Button size="sm" variant="ghost" onClick={clearFilters}><X className="h-3 w-3 mr-1" />Clear</Button>
        )}
        <Badge variant="outline" className="ml-auto">{filtered.length} of {rows.length} events</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-card border border-border rounded-lg p-3 shadow-card">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${s.color}`} />
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-xl font-display font-bold text-card-foreground">{s.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-5 shadow-card">
          <h4 className="font-display font-semibold mb-4 text-card-foreground">Activity Timeline (last {days} days)</h4>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Legend />
              <Line type="monotone" dataKey="submissions" stroke="hsl(var(--primary))" name="Submissions" />
              <Line type="monotone" dataKey="revisions" stroke="hsl(var(--warning))" name="Revisions" />
              <Line type="monotone" dataKey="attachments" stroke="hsl(var(--success))" name="Attachments" />
              <Line type="monotone" dataKey="trainerActions" stroke="hsl(var(--accent))" name="Trainer actions" />
              <Line type="monotone" dataKey="pinned" stroke="hsl(var(--destructive))" name="Pinned" strokeDasharray="4 3" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-lg p-5 shadow-card">
          <h4 className="font-display font-semibold mb-4 text-card-foreground">Top Students by Diff Activity</h4>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topStudents} layout="vertical" margin={{ left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={120} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Legend />
              <Bar dataKey="submissions" stackId="a" fill="hsl(var(--primary))" name="Submissions" />
              <Bar dataKey="revisions" stackId="a" fill="hsl(var(--warning))" name="Revisions" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-lg p-5 shadow-card">
          <h4 className="font-display font-semibold mb-4 text-card-foreground">Status Breakdown</h4>
          {statusBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No status data.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={95} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}>
                  {statusBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-card border border-border rounded-lg p-5 shadow-card">
          <h4 className="font-display font-semibold mb-4 text-card-foreground">Top Curricula by Churn</h4>
          {topChurn.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">No churn yet.</p>
          ) : (
            <div className="space-y-2">
              {topChurn.map((c) => (
                <div key={c.curriculum_id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/40">
                  <code className="text-[10px] text-muted-foreground truncate max-w-[8rem]" title={c.curriculum_id}>{c.curriculum_id.slice(0, 8)}…</code>
                  <div className="flex-1 grid grid-cols-3 gap-2 text-xs">
                    <span><span className="text-muted-foreground">events</span> <b className="text-card-foreground">{c.events}</b></span>
                    <span><span className="text-muted-foreground">atts</span> <b className="text-card-foreground">{c.atts}</b></span>
                    <span><span className="text-muted-foreground">students</span> <b className="text-card-foreground">{c.studentCount}</b></span>
                  </div>
                  <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => setFCurriculum(c.curriculum_id)}>Filter</Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-5 shadow-card">
        <h4 className="font-display font-semibold mb-4 text-card-foreground">Recent Diff Events</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b border-border">
              <tr>
                <th className="text-left p-2">When</th>
                <th className="text-left p-2">Student</th>
                <th className="text-left p-2">Kind</th>
                <th className="text-left p-2">Ver</th>
                <th className="text-left p-2">Atts</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Actor</th>
                <th className="text-right p-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recent.map((r) => (
                <tr key={r.id} className={`hover:bg-muted/30 ${r.pinned ? "bg-destructive/5" : ""}`}>
                  <td className="p-2 text-xs text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-2 text-card-foreground">
                    {r.pinned && <Pin className="h-3 w-3 inline mr-1 text-destructive fill-destructive" />}
                    {r.student_name}
                  </td>
                  <td className="p-2">
                    <Badge variant="outline" className={r.kind === "student_submission" ? "text-primary border-primary/40" : r.kind === "trainer_note" ? "text-accent border-accent/40" : r.kind === "revision_requested" ? "text-destructive border-destructive/40" : "text-warning border-warning/40"}>
                      {r.kind || "event"}
                    </Badge>
                  </td>
                  <td className="p-2 text-xs">{r.version_number ?? "—"}</td>
                  <td className="p-2 text-xs">{r.attCount}</td>
                  <td className="p-2 text-xs">{r.status || "—"}</td>
                  <td className="p-2 text-xs text-muted-foreground">{r.actor_name || r.actor_role || "—"}</td>
                  <td className="p-2 text-right whitespace-nowrap">
                    <Button size="sm" variant="ghost" className="h-7 px-2" title={r.pinned ? "Unpin" : "Pin to student"} onClick={() => togglePin(r)}>
                      <Pin className={`h-3.5 w-3.5 ${r.pinned ? "text-destructive fill-destructive" : ""}`} />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2" title="Request resubmission" disabled={actionBusy === r.id || !r.submission_id} onClick={() => requestResubmission(r)}>
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2" title="Leave trainer note" disabled={!r.submission_id} onClick={() => { setNoteFor(r); setNoteText(""); }}>
                      <StickyNote className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!noteFor} onOpenChange={(o) => { if (!o) { setNoteFor(null); setNoteText(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave trainer note for {noteFor?.student_name}</DialogTitle>
          </DialogHeader>
          <Textarea rows={5} value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Write a note that will appear in this submission's history…" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteFor(null)}>Cancel</Button>
            <Button onClick={submitNote} disabled={!noteText.trim() || actionBusy === noteFor?.id}>
              {actionBusy === noteFor?.id && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}Add note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrainerDiffAnalytics;
