import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Activity, GitCompare, Paperclip, MessageSquare, Users, Pin, RotateCcw, StickyNote, X, Download, AlertTriangle, Minimize2, Maximize2, History, Trash2, RefreshCw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  trainerEmail?: string;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--warning))", "hsl(var(--destructive))", "hsl(var(--accent))"];
const ALL = "__all__";
const countAtts = (s: string) => (s ? s.split(/[\n,|]+/).map((t) => t.trim()).filter(Boolean).length : 0);

const csvCell = (v: any) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const downloadBlob = (filename: string, mime: string, content: string) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const TrainerDiffAnalytics = ({ studentIds, studentNameById, trainerId = "", trainerName = "Trainer", trainerEmail = "" }: Props) => {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [subs, setSubs] = useState<Record<string, { curriculum_id: string; student_id: string; student_name: string }>>({});
  const [pinIdMap, setPinIdMap] = useState<Record<string, string>>({}); // history_id -> pin row id
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [days, setDays] = useState<7 | 14 | 30>(14);
  const [fCurriculum, setFCurriculum] = useState<string>(ALL);
  const [fStudent, setFStudent] = useState<string>(ALL);
  const [fStatus, setFStatus] = useState<string>(ALL);
  const [fActorRole, setFActorRole] = useState<string>(ALL);
  const [noteFor, setNoteFor] = useState<HistoryRow | null>(null);
  const [noteText, setNoteText] = useState("");
  const [confirmResub, setConfirmResub] = useState<HistoryRow | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Background export jobs (server-side, durable across refreshes)
  const HARD_MAX = 20000;
  type Cursor = { createdAt: string; id: string };
  type ExportJob = {
    id: string;
    format: "csv" | "pdf";
    status: "queued" | "running" | "done" | "canceled" | "error";
    rows_fetched: number;
    pages_fetched: number;
    estimated_total: number;
    hard_max: number;
    will_truncate: boolean;
    cancel_requested: boolean;
    error_message: string;
    file_path: string;
    file_size_bytes: number;
    format_downgraded: boolean;
    cursor_created_at: string | null;
    cursor_id: string | null;
    job_label: string;
    created_at: string;
    completed_at: string | null;
  };
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeMinimized, setActiveMinimized] = useState(false);
  const [showJobsPanel, setShowJobsPanel] = useState(false);
  // Recent exports panel: filters, pagination, auto-download
  const [autoDownload, setAutoDownload] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("trainer_export_auto_download") === "1";
  });
  const autoDownloadedRef = useRef<Set<string>>(new Set());
  const [jobsStatusFilter, setJobsStatusFilter] = useState<string>(ALL);
  const [jobsFormatFilter, setJobsFormatFilter] = useState<string>(ALL);
  const [jobsDateFilter, setJobsDateFilter] = useState<"all" | "today" | "7d" | "30d">("all");
  const [jobsPage, setJobsPage] = useState(1);
  const JOBS_PAGE_SIZE = 6;
  const [estimate, setEstimate] = useState<{
    format: "csv" | "pdf";
    loading: boolean;
    count: number | null;
    willTruncate: boolean;
    error?: string;
    startCursor?: Cursor;
    jobLabel?: string;
    parentJobId?: string;
  } | null>(null);
  const [resumeOffer, setResumeOffer] = useState<{
    format: "csv" | "pdf";
    cursor: Cursor;
    previousCount: number;
    parentJobId: string;
  } | null>(null);
  const dismissedResumeRef = useRef<Set<string>>(new Set());


  const sidsKey = studentIds.join(",");

  const fetchPins = useCallback(async () => {
    if (!trainerId || !trainerEmail) { setPinIdMap({}); return; }
    const { data } = await supabase.rpc("list_trainer_pins", { _trainer_id: trainerId, _email: trainerEmail });
    const m: Record<string, string> = {};
    (data || []).forEach((p: any) => { m[p.history_id] = p.id; });
    setPinIdMap(m);
  }, [trainerId, trainerEmail]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    if (studentIds.length === 0) { setRows([]); setSubs({}); setLoading(false); return; }
    const since = new Date(Date.now() - days * 86400000).toISOString();

    let query = supabase
      .from("curriculum_submission_history")
      .select("*")
      .in("student_id", studentIds)
      .gte("created_at", since);

    if (fCurriculum !== ALL) query = query.eq("curriculum_id", fCurriculum);
    if (fStudent !== ALL) query = query.eq("student_id", fStudent);
    if (fStatus !== ALL) query = query.ilike("status", fStatus);
    if (fActorRole !== ALL) query = query.ilike("actor_role", fActorRole);

    const { data: hist } = await query.order("created_at", { ascending: false }).limit(2000);

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
  }, [sidsKey, days, fCurriculum, fStudent, fStatus, fActorRole]);

  useEffect(() => { fetchRows(); }, [fetchRows]);
  useEffect(() => { fetchPins(); }, [fetchPins]);

  // Lightweight option lists: load distinct curricula/students from a small lookup query so dropdowns aren't bound to the (possibly filtered) rows.
  const [allCurricula, setAllCurricula] = useState<string[]>([]);
  const [allStatuses, setAllStatuses] = useState<string[]>([]);
  const [allActorRoles, setAllActorRoles] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    (async () => {
      if (!studentIds.length) return;
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const { data } = await supabase
        .from("curriculum_submission_history")
        .select("curriculum_id, status, actor_role")
        .in("student_id", studentIds)
        .gte("created_at", since)
        .limit(2000);
      if (!active) return;
      setAllCurricula(Array.from(new Set((data || []).map((r: any) => r.curriculum_id).filter(Boolean))).slice(0, 200));
      setAllStatuses(Array.from(new Set((data || []).map((r: any) => (r.status || "").toLowerCase()).filter(Boolean))));
      setAllActorRoles(Array.from(new Set((data || []).map((r: any) => (r.actor_role || "").toLowerCase()).filter(Boolean))));
    })();
    return () => { active = false; };
  }, [sidsKey, days]);

  const enriched = useMemo(() => rows.map((r) => ({
    ...r,
    student_name: r.student_name || studentNameById[r.student_id] || subs[r.submission_id]?.student_name || "Student",
    attCount: countAtts(r.attachment_name),
    fbLen: (r.trainer_feedback || "").length,
    notesLen: (r.notes || "").length,
    pinned: !!pinIdMap[r.id],
  })), [rows, subs, studentNameById, pinIdMap]);

  // Client-side text search only (DB filters handled the dropdowns)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return enriched;
    return enriched.filter((r) =>
      r.student_name.toLowerCase().includes(q) ||
      (r.attachment_name || "").toLowerCase().includes(q) ||
      (r.actor_name || "").toLowerCase().includes(q) ||
      (r.curriculum_id || "").toLowerCase().includes(q) ||
      (r.notes || "").toLowerCase().includes(q),
    );
  }, [enriched, search]);

  const studentOptions = useMemo(() => Object.entries(studentNameById).slice(0, 500), [studentNameById]);

  const counters = useMemo(() => {
    const total = filtered.length;
    const studentSubs = filtered.filter((r) => r.kind === "student_submission").length;
    return {
      total,
      studentSubs,
      trainerEvents: total - studentSubs,
      uniqStudents: new Set(filtered.map((r) => r.student_id)).size,
      uniqCurricula: new Set(filtered.map((r) => r.curriculum_id)).size,
      totalAtts: filtered.reduce((a, r) => a + r.attCount, 0),
      pinnedCount: filtered.filter((r) => r.pinned).length,
    };
  }, [filtered]);

  const topStudents = useMemo(() => {
    const m = new Map<string, { name: string; revisions: number; submissions: number }>();
    filtered.forEach((r) => {
      const cur = m.get(r.student_id) || { name: r.student_name, revisions: 0, submissions: 0 };
      if (r.kind === "student_submission") cur.submissions += 1; else cur.revisions += 1;
      m.set(r.student_id, cur);
    });
    return Array.from(m.values()).sort((a, b) => (b.revisions + b.submissions) - (a.revisions + a.submissions)).slice(0, 8);
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

  const togglePin = async (r: any) => {
    if (!trainerId || !trainerEmail) { toast.error("Trainer session missing"); return; }
    const existing = pinIdMap[r.id];
    if (existing) {
      const { error } = await supabase.rpc("unpin_diff", { _trainer_id: trainerId, _email: trainerEmail, _pin_id: existing });
      if (error) { toast.error("Failed to unpin"); return; }
      setPinIdMap((m) => { const n = { ...m }; delete n[r.id]; return n; });
      toast.success("Unpinned");
    } else {
      const { data, error } = await supabase.rpc("pin_diff", {
        _trainer_id: trainerId, _email: trainerEmail,
        _history_id: r.id, _student_id: r.student_id,
        _curriculum_id: r.curriculum_id, _submission_id: r.submission_id,
      });
      if (error || !data) { toast.error("Failed to pin"); return; }
      setPinIdMap((m) => ({ ...m, [r.id]: data as string }));
      toast.success(`Pinned to ${r.student_name || "student"}`);
    }
  };

  const requestResubmission = async (r: any) => {
    if (!r.submission_id) { toast.error("No submission linked"); return; }
    if (!trainerId || !trainerEmail) { toast.error("Trainer session missing"); return; }
    setActionBusy(r.id);
    const { data, error } = await supabase.rpc("request_resubmission", {
      _trainer_id: trainerId, _email: trainerEmail, _trainer_name: trainerName,
      _submission_id: r.submission_id, _curriculum_id: r.curriculum_id, _student_id: r.student_id,
      _message: "Trainer requested a fresh revision from analytics view.",
    });
    setActionBusy(null);
    setConfirmResub(null);
    if (error) { toast.error("Failed to request resubmission"); return; }
    toast.success("Resubmission requested", {
      description: `Status → revision_requested · history event #${String(data).slice(0, 8)} logged for ${r.student_name}`,
    });
    fetchRows();
  };

  const submitNote = async () => {
    if (!noteFor || !noteText.trim()) return;
    if (!trainerId || !trainerEmail) { toast.error("Trainer session missing"); return; }
    setActionBusy(noteFor.id);
    const { data, error } = await supabase.rpc("add_trainer_note", {
      _trainer_id: trainerId, _email: trainerEmail, _trainer_name: trainerName,
      _submission_id: noteFor.submission_id, _curriculum_id: noteFor.curriculum_id, _student_id: noteFor.student_id,
      _status: noteFor.status || "", _note: noteText.trim(),
    });
    setActionBusy(null);
    if (error) { toast.error("Failed to add note"); return; }
    toast.success("Note added", { description: `History event #${String(data).slice(0, 8)} logged for ${noteFor.student_name}` });
    setNoteFor(null); setNoteText("");
    fetchRows();
  };

  const filtersStamp = `${days}d_${fCurriculum}_${fStudent}_${fStatus}_${fActorRole}_${search || "all"}`.replace(/[^\w-]+/g, "-").slice(0, 80);

  // (Server-side keyset pagination, estimator, and job lifecycle live below.)


  // ---------- Server-side background export jobs ----------

  const reloadJobs = useCallback(async () => {
    if (!trainerId || !trainerEmail) { setExportJobs([]); return; }
    const { data, error } = await supabase.rpc("list_trainer_export_jobs", {
      _trainer_id: trainerId, _email: trainerEmail, _limit: 10,
    });
    if (error) { console.warn("list jobs", error); return; }
    setExportJobs((data as any[]) || []);
  }, [trainerId, trainerEmail]);

  useEffect(() => { reloadJobs(); }, [reloadJobs]);

  // Realtime: subscribe to all of this trainer's export job rows.
  useEffect(() => {
    if (!trainerEmail) return;
    const channel = supabase
      .channel(`trainer_export_jobs:${trainerEmail}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trainer_export_jobs", filter: `trainer_email=eq.${trainerEmail.toLowerCase()}` },
        (payload) => {
          const newRow = payload.new as ExportJob | undefined;
          const oldRow = payload.old as ExportJob | undefined;
          setExportJobs((prev) => {
            if (payload.eventType === "DELETE") {
              return prev.filter((j) => j.id !== oldRow?.id);
            }
            if (!newRow) return prev;
            const idx = prev.findIndex((j) => j.id === newRow.id);
            if (idx === -1) return [newRow, ...prev].slice(0, 10);
            const next = prev.slice();
            next[idx] = { ...next[idx], ...newRow };
            return next;
          });
          // When a job finishes truncated, surface the resume offer (once per job).
          if (newRow && newRow.status === "done" && newRow.will_truncate
              && newRow.cursor_created_at && newRow.cursor_id
              && !dismissedResumeRef.current.has(newRow.id)) {
            setResumeOffer({
              format: newRow.format,
              cursor: { createdAt: newRow.cursor_created_at, id: newRow.cursor_id },
              previousCount: newRow.rows_fetched,
              parentJobId: newRow.id,
            });
          }
          if (newRow && newRow.status === "done" && newRow.id === activeJobId) {
            toast.success(`Export ready · ${newRow.rows_fetched.toLocaleString()} rows`, {
              description: "Click Download in the export panel.",
            });
          }
          if (newRow && newRow.status === "error" && newRow.id === activeJobId) {
            toast.error(`Export failed: ${newRow.error_message || "unknown"}`);
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [trainerEmail, activeJobId]);

  // Pre-export estimator: counts rows server-side without fetching them.
  const estimateRowCount = async (startCursor?: Cursor): Promise<number | null> => {
    if (!studentIds.length) return 0;
    const since = new Date(Date.now() - days * 86400000).toISOString();
    let q = supabase
      .from("curriculum_submission_history")
      .select("id", { count: "exact", head: true })
      .in("student_id", studentIds)
      .gte("created_at", since);
    if (fCurriculum !== ALL) q = q.eq("curriculum_id", fCurriculum);
    if (fStudent !== ALL) q = q.eq("student_id", fStudent);
    if (fStatus !== ALL) q = q.ilike("status", fStatus);
    if (fActorRole !== ALL) q = q.ilike("actor_role", fActorRole);
    if (startCursor) {
      q = q.or(`created_at.lt.${startCursor.createdAt},and(created_at.eq.${startCursor.createdAt},id.lt.${startCursor.id})`);
    }
    const { count, error } = await q;
    if (error) throw error;
    return count ?? 0;
  };

  const beginExport = async (
    format: "csv" | "pdf",
    startCursor?: Cursor,
    jobLabel?: string,
    parentJobId?: string,
  ) => {
    setEstimate({ format, loading: true, count: null, willTruncate: false, startCursor, jobLabel, parentJobId });
    try {
      const total = await estimateRowCount(startCursor);
      const projected = total ?? 0;
      setEstimate({
        format, loading: false, count: projected,
        willTruncate: projected > HARD_MAX,
        startCursor, jobLabel, parentJobId,
      });
    } catch (e) {
      console.error(e);
      setEstimate({ format, loading: false, count: null, willTruncate: false,
        error: "Could not estimate row count.", startCursor, jobLabel, parentJobId });
    }
  };

  const confirmEstimate = async () => {
    if (!estimate || !trainerId || !trainerEmail) { setEstimate(null); return; }
    const { format, startCursor, jobLabel, parentJobId, count } = estimate;
    setEstimate(null);

    const filters = {
      days,
      curriculum_id: fCurriculum !== ALL ? fCurriculum : "",
      student_id: fStudent !== ALL ? fStudent : "",
      status: fStatus !== ALL ? fStatus : "",
      actor_role: fActorRole !== ALL ? fActorRole : "",
    };

    const { data: jobId, error } = await supabase.rpc("create_trainer_export_job", {
      _trainer_id: trainerId, _email: trainerEmail, _trainer_name: trainerName,
      _format: format, _filters: filters, _student_ids: studentIds,
      _estimated_total: count ?? 0, _hard_max: HARD_MAX,
      _will_truncate: (count ?? 0) > HARD_MAX,
      _start_cursor_created_at: startCursor?.createdAt ?? null,
      _start_cursor_id: startCursor?.id ?? null,
      _job_label: jobLabel ?? "",
      _parent_job_id: parentJobId ?? null,
    });
    if (error || !jobId) {
      console.error(error);
      toast.error("Could not queue export job");
      return;
    }
    setActiveJobId(jobId as string);
    setActiveMinimized(false);
    setShowJobsPanel(true);

    // Fire-and-forget runner; it returns immediately and processes in background.
    supabase.functions.invoke("trainer-export-runner", { body: { jobId } })
      .catch((e) => console.error("invoke runner", e));

    toast.message("Export started in the background", {
      description: "Safe to refresh or close this tab — you can resume from the Recent exports panel.",
    });
    reloadJobs();
  };

  const exportCsv = () => beginExport("csv");
  const exportPdf = () => beginExport("pdf");

  const cancelJob = async (jobId: string) => {
    if (!trainerId || !trainerEmail) return;
    await supabase.rpc("cancel_trainer_export_job", { _trainer_id: trainerId, _email: trainerEmail, _job_id: jobId });
    toast.message("Cancellation requested", { description: "The job will stop after the current page." });
  };

  const downloadJob = async (jobId: string) => {
    if (!trainerId || !trainerEmail) return;
    try {
      const { data, error } = await supabase.functions.invoke("trainer-export-download", {
        body: { jobId, trainerId, trainerEmail },
      });
      if (error) throw error;
      const url = (data as any)?.url;
      if (!url) throw new Error("No URL returned");
      const a = document.createElement("a");
      a.href = url; a.target = "_blank"; a.rel = "noopener"; a.click();
    } catch (e) {
      console.error(e);
      toast.error("Could not get download link");
    }
  };

  const deleteJob = async (jobId: string) => {
    if (!trainerId || !trainerEmail) return;
    await supabase.rpc("delete_trainer_export_job", { _trainer_id: trainerId, _email: trainerEmail, _job_id: jobId });
    setExportJobs((prev) => prev.filter((j) => j.id !== jobId));
    if (activeJobId === jobId) setActiveJobId(null);
  };

  const runResumeJob = () => {
    if (!resumeOffer) return;
    const { format, cursor, previousCount, parentJobId } = resumeOffer;
    dismissedResumeRef.current.add(parentJobId);
    const jobLabel = `continued-${new Date().toISOString().slice(11, 19).replace(/:/g, "")}`;
    setResumeOffer(null);
    toast.message("Starting follow-up export", { description: `Fetching rows older than the previous ${previousCount}.` });
    beginExport(format, cursor, jobLabel, parentJobId);
  };

  const dismissResumeOffer = () => {
    if (resumeOffer) dismissedResumeRef.current.add(resumeOffer.parentJobId);
    setResumeOffer(null);
  };

  const activeJob = useMemo(
    () => exportJobs.find((j) => j.id === activeJobId) || null,
    [exportJobs, activeJobId],
  );
  const isJobRunning = (s: string) => s === "queued" || s === "running";
  const jobProgressPct = (j: ExportJob) => {
    if (j.status === "done") return 100;
    const denom = j.estimated_total > 0 ? Math.min(j.estimated_total, j.hard_max) : j.hard_max;
    if (!denom) return 0;
    return Math.min(99, Math.round((j.rows_fetched / denom) * 100));
  };



  const clearFilters = () => { setSearch(""); setFCurriculum(ALL); setFStudent(ALL); setFStatus(ALL); setFActorRole(ALL); };
  const hasFilters = search || fCurriculum !== ALL || fStudent !== ALL || fStatus !== ALL || fActorRole !== ALL;

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (rows.length === 0 && !hasFilters) {
    return (
      <div className="bg-card rounded-lg border border-border p-12 text-center">
        <GitCompare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <h3 className="font-display font-semibold text-card-foreground">No submission diffs in last {days} days</h3>
        <p className="text-sm text-muted-foreground mt-1">Try a wider window or wait for student activity.</p>
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
            {allCurricula.map((c) => <SelectItem key={c} value={c}>{c.slice(0, 8)}…</SelectItem>)}
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
            {allStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={fActorRole} onValueChange={setFActorRole}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Actor role" /></SelectTrigger>
          <SelectContent><SelectItem value={ALL}>All actors</SelectItem>
            {allActorRoles.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" disabled={filtered.length === 0 || exportingPdf}>
              {exportingPdf ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />}
              Export ({filtered.length})
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportCsv}>Download CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={exportPdf}>Download PDF</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Badge variant="outline">{filtered.length} of {rows.length} loaded</Badge>
      </div>

      {rows.length === 0 && hasFilters && (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
          No diff events match the current filters in the last {days} days.
        </div>
      )}

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
                    <Button size="sm" variant="ghost" className="h-7 px-2" title="Request resubmission" disabled={actionBusy === r.id || !r.submission_id} onClick={() => setConfirmResub(r)}>
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
            <DialogDescription>This note becomes a permanent entry in the submission history (kind: trainer_note).</DialogDescription>
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

      <AlertDialog open={!!confirmResub} onOpenChange={(o) => { if (!o) setConfirmResub(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request a resubmission?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmResub && (
                <>
                  Submission for <b>{confirmResub.student_name}</b> will move to <b>revision_requested</b>, and a new history event will be logged under your name. The student will see the new request.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionBusy === confirmResub?.id}
              onClick={(e) => { e.preventDefault(); if (confirmResub) requestResubmission(confirmResub); }}
            >
              {actionBusy === confirmResub?.id && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}Request resubmission
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pre-export estimator */}
      <AlertDialog open={!!estimate} onOpenChange={(o) => { if (!o && !estimate?.loading) setEstimate(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {estimate?.loading
                ? `Estimating ${estimate.format.toUpperCase()} export…`
                : `Confirm ${estimate?.format.toUpperCase()} export`}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {estimate?.loading && (
                  <p className="flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Counting matching rows server-side…</p>
                )}
                {!estimate?.loading && estimate?.error && (
                  <p className="text-destructive">{estimate.error} You can still continue; pagination will stop at the safety cap.</p>
                )}
                {!estimate?.loading && estimate?.count !== null && estimate && (
                  <>
                    <p>
                      About to export <b>{estimate.count.toLocaleString()}</b> rows for the current filters
                      {estimate.startCursor ? " (resume job, older than previous cutoff)" : ""}.
                      Client text search will further narrow this set after fetching.
                    </p>
                    {estimate.willTruncate && (
                      <p className="flex items-start gap-2 text-warning">
                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>
                          Estimate exceeds the {HARD_MAX.toLocaleString()}-row safety cap. Only the most recent
                          {" "}<b>{HARD_MAX.toLocaleString()}</b> rows will be in this file. You can run a follow-up export afterwards.
                        </span>
                      </p>
                    )}
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={estimate?.loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={estimate?.loading} onClick={(e) => { e.preventDefault(); confirmEstimate(); }}>
              Start export
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Active job dialog (server-side, durable) */}
      <Dialog
        open={!!activeJob && !activeMinimized}
        onOpenChange={(o) => {
          if (o) return;
          if (activeJob && isJobRunning(activeJob.status)) setActiveMinimized(true);
          else setActiveJobId(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {activeJob?.status === "queued" && `Queued · ${activeJob.format.toUpperCase()} export`}
              {activeJob?.status === "running" && `Running · ${activeJob.format.toUpperCase()} export`}
              {activeJob?.status === "done" && `${activeJob.format.toUpperCase()} export ready`}
              {activeJob?.status === "canceled" && `Export canceled`}
              {activeJob?.status === "error" && `Export failed`}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-1">
                {activeJob && (
                  <>
                    <p>
                      {activeJob.rows_fetched.toLocaleString()} of ~{Math.min(activeJob.estimated_total || activeJob.hard_max, activeJob.hard_max).toLocaleString()} rows
                      {" · "}{activeJob.pages_fetched} page{activeJob.pages_fetched === 1 ? "" : "s"}
                    </p>
                    {activeJob.will_truncate && (
                      <p className="flex items-start gap-2 text-warning">
                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>This job is likely to be truncated at the {activeJob.hard_max.toLocaleString()}-row cap. A follow-up will be offered automatically.</span>
                      </p>
                    )}
                    {activeJob.format_downgraded && (
                      <p className="text-warning">PDF was downgraded to CSV because the dataset is too large to render as a PDF.</p>
                    )}
                    {activeJob.status === "error" && (
                      <p className="text-destructive">{activeJob.error_message || "Unknown error"}</p>
                    )}
                    <p className="text-xs text-muted-foreground">Runs on the server — safe to refresh or close this tab.</p>
                  </>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          {activeJob && isJobRunning(activeJob.status) && (
            <Progress value={jobProgressPct(activeJob)} />
          )}
          <DialogFooter>
            {activeJob && isJobRunning(activeJob.status) ? (
              <>
                <Button variant="outline" onClick={() => setActiveMinimized(true)}>
                  <Minimize2 className="h-3.5 w-3.5 mr-1" />Run in background
                </Button>
                <Button variant="destructive" onClick={() => cancelJob(activeJob.id)} disabled={activeJob.cancel_requested}>
                  <X className="h-3.5 w-3.5 mr-1" />Cancel
                </Button>
              </>
            ) : activeJob?.status === "done" ? (
              <>
                <Button variant="outline" onClick={() => setActiveJobId(null)}>Close</Button>
                <Button onClick={() => downloadJob(activeJob.id)}>
                  <Download className="h-3.5 w-3.5 mr-1" />Download
                </Button>
              </>
            ) : (
              <Button onClick={() => setActiveJobId(null)}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating background-job chip when minimized */}
      {activeJob && activeMinimized && (
        <div className="fixed bottom-4 right-4 z-50 w-72 bg-card border border-border shadow-lg rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-medium text-card-foreground">
              {isJobRunning(activeJob.status) ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              ) : (
                <Download className="h-3.5 w-3.5 text-success" />
              )}
              <span>
                {activeJob.status === "queued" && `Queued ${activeJob.format.toUpperCase()}…`}
                {activeJob.status === "running" && `Exporting ${activeJob.format.toUpperCase()}…`}
                {activeJob.status === "done" && `${activeJob.format.toUpperCase()} ready`}
                {activeJob.status === "canceled" && `Canceled`}
                {activeJob.status === "error" && `Failed`}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setActiveMinimized(false)} title="Restore">
                <Maximize2 className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setActiveJobId(null)} title="Dismiss">
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <Progress value={jobProgressPct(activeJob)} />
          <p className="text-[11px] text-muted-foreground">
            {activeJob.rows_fetched.toLocaleString()} / ~{Math.min(activeJob.estimated_total || activeJob.hard_max, activeJob.hard_max).toLocaleString()} rows · {activeJob.pages_fetched} pg
            {activeJob.will_truncate ? " · may truncate" : ""}
          </p>
        </div>
      )}

      {/* Recent exports panel */}
      <Dialog open={showJobsPanel} onOpenChange={setShowJobsPanel}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><History className="h-4 w-4" /> Recent exports</DialogTitle>
            <DialogDescription>Background jobs persist across refreshes. Files are kept for 7 days.</DialogDescription>
          </DialogHeader>
          {exportJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No export jobs yet.</p>
          ) : (
            <div className="divide-y divide-border max-h-[60vh] overflow-y-auto">
              {exportJobs.map((j) => (
                <div key={j.id} className="py-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">{j.format.toUpperCase()}</Badge>
                      <Badge variant={j.status === "done" ? "default" : j.status === "error" ? "destructive" : "secondary"}>{j.status}</Badge>
                      {j.will_truncate && <Badge variant="outline" className="text-warning border-warning/40">truncated</Badge>}
                      {j.format_downgraded && <Badge variant="outline">PDF→CSV</Badge>}
                      <span className="text-xs text-muted-foreground">{new Date(j.created_at).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {j.status === "done" && (
                        <Button size="sm" variant="outline" onClick={() => downloadJob(j.id)}>
                          <Download className="h-3.5 w-3.5 mr-1" />Download
                        </Button>
                      )}
                      {isJobRunning(j.status) && (
                        <Button size="sm" variant="ghost" onClick={() => cancelJob(j.id)} disabled={j.cancel_requested}>
                          <X className="h-3.5 w-3.5 mr-1" />Cancel
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => { setActiveJobId(j.id); setActiveMinimized(false); }}>Open</Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteJob(j.id)} title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <Progress value={jobProgressPct(j)} />
                  <p className="text-[11px] text-muted-foreground">
                    {j.rows_fetched.toLocaleString()} / ~{Math.min(j.estimated_total || j.hard_max, j.hard_max).toLocaleString()} rows
                    {" · "}{j.pages_fetched} pages
                    {j.error_message ? ` · ${j.error_message}` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={reloadJobs}><RefreshCw className="h-3.5 w-3.5 mr-1" />Refresh</Button>
            <Button onClick={() => setShowJobsPanel(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resume offer when HARD_MAX is reached */}
      <AlertDialog open={!!resumeOffer} onOpenChange={(o) => { if (!o) dismissResumeOffer(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Export hit the {HARD_MAX.toLocaleString()}-row safety cap
            </AlertDialogTitle>
            <AlertDialogDescription>
              {resumeOffer && (
                <>
                  We saved the first <b>{resumeOffer.previousCount.toLocaleString()}</b> rows. There may be older rows in the same window that weren't included.
                  Start a follow-up {resumeOffer.format.toUpperCase()} export for everything older than the last row?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={dismissResumeOffer}>Skip</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); runResumeJob(); }}>
              Export remaining rows
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default TrainerDiffAnalytics;
