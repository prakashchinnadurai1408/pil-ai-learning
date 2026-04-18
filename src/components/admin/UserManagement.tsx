import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, UserPlus, Edit, Trash2, Eye, Download, X, KeyRound,
  Users, GraduationCap, TrendingUp, BarChart3, Ban, CheckCircle, UserCog, Sparkles, Loader2, FolderKanban
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { toast } from "sonner";
import { useTrainerData } from "@/hooks/useTrainerData";
import type { StudentData } from "@/hooks/useTrainerData";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from "recharts";
import AssignProjectDialog from "@/components/shared/AssignProjectDialog";

const UserManagement = ({ initialSearch, onClearSearch }: { initialSearch?: string; onClearSearch?: () => void }) => {
  const { students, loading, totalStudents, avgProgress, avgOverallScore, moduleStats, scoreDistribution } = useTrainerData();
  const [searchQuery, setSearchQuery] = useState(initialSearch || "");
  const [roleFilter, setRoleFilter] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<StudentData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", mobile: "", college: "", location: "", role: "candidate" });
  const [editUser, setEditUser] = useState({ name: "", email: "", mobile: "", college: "", location: "" });
  const [newPassword, setNewPassword] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  // Trainer assignments: studentId -> Set of trainer IDs
  const [trainerMap, setTrainerMap] = useState<Record<string, Set<string>>>({});
  const [trainersList, setTrainersList] = useState<{ id: string; name: string; college: string }[]>([]);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignDraft, setReassignDraft] = useState<Set<string>>(new Set());
  const [savingReassign, setSavingReassign] = useState(false);

  // AI path status per candidate: candidate_id -> { id, generated_at, is_beginner_default, status, title, rationale, model_used }
  const [pathMap, setPathMap] = useState<Record<string, { id: string; generated_at: string; is_beginner_default: boolean; status: string; title: string; rationale: string; model_used: string }>>({});
  const [pathFilter, setPathFilter] = useState<string>("all"); // all | has | none | beginner

  // Path detail side panel
  const [pathSheetOpen, setPathSheetOpen] = useState(false);
  const [pathSheetCandidate, setPathSheetCandidate] = useState<StudentData | null>(null);
  const [pathSheetLoading, setPathSheetLoading] = useState(false);
  const [pathSheetModules, setPathSheetModules] = useState<Array<{ id: string; module_id: number; module_title: string; sort_order: number; reason: string }>>([]);

  // Bulk AI Path generation
  const [collegeFilter, setCollegeFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [degreeFilter, setDegreeFilter] = useState<string>("all");
  const [extraMeta, setExtraMeta] = useState<Record<string, { department: string; degree: string }>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [assignProjectOpen, setAssignProjectOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase.from("students") as any).select("id, status");
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((s: any) => { map[s.id] = s.status || "active"; });
        setStatusMap(map);
      }
    })();
  }, [refreshKey, students.length]);

  // Sync initialSearch prop into local state when it changes
  useEffect(() => {
    if (initialSearch) {
      setSearchQuery(initialSearch);
    }
  }, [initialSearch]);

  // Load trainer assignments + trainer list + extra student meta (department, degree) + AI path status
  useEffect(() => {
    (async () => {
      const [{ data: ts }, { data: tr }, { data: stu }, { data: paths }] = await Promise.all([
        (supabase as any).from("trainer_students").select("trainer_id, student_id"),
        supabase.from("trainers").select("id, name, college").order("name"),
        supabase.from("students").select("id, department, degree"),
        (supabase as any).from("candidate_learning_paths")
          .select("id, candidate_id, generated_at, is_beginner_default, status, title, rationale, model_used")
          .eq("status", "active")
          .order("generated_at", { ascending: false }),
      ]);
      const map: Record<string, Set<string>> = {};
      (ts || []).forEach((row: any) => {
        if (!map[row.student_id]) map[row.student_id] = new Set();
        map[row.student_id].add(row.trainer_id);
      });
      setTrainerMap(map);
      setTrainersList(tr || []);
      const meta: Record<string, { department: string; degree: string }> = {};
      (stu || []).forEach((s: any) => { meta[s.id] = { department: s.department || "", degree: s.degree || "" }; });
      setExtraMeta(meta);
      const pmap: Record<string, { id: string; generated_at: string; is_beginner_default: boolean; status: string; title: string; rationale: string; model_used: string }> = {};
      (paths || []).forEach((p: any) => {
        if (!pmap[p.candidate_id]) {
          pmap[p.candidate_id] = {
            id: p.id,
            generated_at: p.generated_at,
            is_beginner_default: !!p.is_beginner_default,
            status: p.status,
            title: p.title || "",
            rationale: p.rationale || "",
            model_used: p.model_used || "",
          };
        }
      });
      setPathMap(pmap);
    })();
  }, [refreshKey]);

  const openPathSheet = async (u: StudentData) => {
    const p = pathMap[u.id];
    if (!p) return;
    setPathSheetCandidate(u);
    setPathSheetOpen(true);
    setPathSheetLoading(true);
    setPathSheetModules([]);
    const { data } = await (supabase as any)
      .from("candidate_learning_path_modules")
      .select("id, module_id, module_title, sort_order, reason")
      .eq("path_id", p.id)
      .order("sort_order", { ascending: true });
    setPathSheetModules(data || []);
    setPathSheetLoading(false);
  };

  const openReassign = (u: StudentData) => {
    setSelectedUser(u);
    setReassignDraft(new Set(trainerMap[u.id] || []));
    setReassignOpen(true);
  };

  const toggleReassign = (trainerId: string) => {
    setReassignDraft(prev => {
      const next = new Set(prev);
      if (next.has(trainerId)) next.delete(trainerId); else next.add(trainerId);
      return next;
    });
  };

  const saveReassign = async () => {
    if (!selectedUser) return;
    setSavingReassign(true);
    const existing = trainerMap[selectedUser.id] || new Set<string>();
    const toAdd: string[] = [];
    const toRemove: string[] = [];
    reassignDraft.forEach(id => { if (!existing.has(id)) toAdd.push(id); });
    existing.forEach(id => { if (!reassignDraft.has(id)) toRemove.push(id); });
    if (toRemove.length > 0) {
      await (supabase as any).from("trainer_students")
        .delete().eq("student_id", selectedUser.id).in("trainer_id", toRemove);
    }
    if (toAdd.length > 0) {
      await (supabase as any).from("trainer_students").insert(
        toAdd.map(trainer_id => ({ trainer_id, student_id: selectedUser.id }))
      );
    }
    toast.success(`Updated trainers for ${selectedUser.name}`);
    setSavingReassign(false);
    setReassignOpen(false);
    setRefreshKey(k => k + 1);
  };

  const filteredUsers = useMemo(() => {
    return students.filter(s => {
      if (collegeFilter !== "all" && s.college !== collegeFilter) return false;
      const meta = extraMeta[s.id];
      if (departmentFilter !== "all" && (meta?.department || "") !== departmentFilter) return false;
      if (degreeFilter !== "all" && (meta?.degree || "") !== degreeFilter) return false;
      if (pathFilter !== "all") {
        const p = pathMap[s.id];
        if (pathFilter === "has" && !p) return false;
        if (pathFilter === "none" && p) return false;
        if (pathFilter === "beginner" && !(p && p.is_beginner_default)) return false;
      }
      if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase()) && !s.email.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [students, searchQuery, collegeFilter, departmentFilter, degreeFilter, extraMeta, pathFilter, pathMap]);

  // Distinct dropdown options
  const collegeOptions = useMemo(
    () => Array.from(new Set(students.map(s => s.college).filter(Boolean))).sort(),
    [students]
  );
  const departmentOptions = useMemo(
    () => Array.from(new Set(Object.values(extraMeta).map(m => m.department).filter(Boolean))).sort(),
    [extraMeta]
  );
  const degreeOptions = useMemo(
    () => Array.from(new Set(Object.values(extraMeta).map(m => m.degree).filter(Boolean))).sort(),
    [extraMeta]
  );

  // Selection helpers
  const allFilteredSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedIds.has(u.id));
  const someFilteredSelected = filteredUsers.some(u => selectedIds.has(u.id));
  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredUsers.forEach(u => next.delete(u.id));
      } else {
        filteredUsers.forEach(u => next.add(u.id));
      }
      return next;
    });
  };
  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  const pollBulkProgress = (ids: string[], startedAt: string, expectedTotal: number) => {
    if (expectedTotal <= 0) return;
    const toastId = toast.loading(`Generating AI paths… 0/${expectedTotal} completed`);
    const startMs = Date.now();
    const MAX_MS = 10 * 60 * 1000; // 10 min cap
    const interval = window.setInterval(async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("candidate_learning_paths")
          .select("candidate_id, generated_at")
          .in("candidate_id", ids)
          .gte("generated_at", startedAt);
        if (error) throw error;
        const doneIds = new Set((data || []).map((r: any) => r.candidate_id));
        const done = doneIds.size;
        if (done >= expectedTotal) {
          window.clearInterval(interval);
          toast.success(`AI paths generated: ${done}/${expectedTotal} completed`, { id: toastId });
          setRefreshKey((k) => k + 1);
          return;
        }
        if (Date.now() - startMs > MAX_MS) {
          window.clearInterval(interval);
          toast.warning(`Bulk generation taking longer than expected: ${done}/${expectedTotal} completed. Polling stopped.`, { id: toastId });
          return;
        }
        toast.loading(`Generating AI paths… ${done}/${expectedTotal} completed`, { id: toastId });
      } catch (e) {
        // keep polling on transient errors
        console.error("poll error", e);
      }
    }, 4000);
  };

  const runBulkGenerate = async () => {
    if (selectedIds.size === 0) {
      toast.error("Select at least one candidate");
      return;
    }
    setBulkRunning(true);
    const ids = Array.from(selectedIds);
    const startedAt = new Date().toISOString();
    try {
      const { data, error } = await supabase.functions.invoke("bulk-generate-candidate-paths", {
        body: { candidateIds: ids, overwrite: overwriteExisting },
      });
      if (error) throw error;
      const queued: number = data?.queued ?? ids.length;
      const skipped: number = data?.skipped ?? 0;
      toast.success(data?.message || `Started generating paths for ${queued} candidate(s)`);
      setBulkOpen(false);
      clearSelection();
      if (queued > 0) {
        // Only poll for candidates actually being processed (exclude skipped ones)
        // We don't know which were skipped server-side, so poll for all selected and
        // expect `queued` new generations after startedAt.
        pollBulkProgress(ids, startedAt, queued);
      } else if (skipped > 0) {
        toast.info(`All ${skipped} candidate(s) already had paths. Nothing to generate.`);
      }
    } catch (e: any) {
      toast.error(`Failed to start: ${e.message || "Unknown error"}`);
    } finally {
      setBulkRunning(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.mobile || !newUser.college || !newUser.location) {
      toast.error("Please fill all fields");
      return;
    }
    const { error } = await supabase.from("students").insert({
      name: newUser.name.trim(),
      email: newUser.email.trim(),
      mobile: newUser.mobile.trim(),
      college: newUser.college.trim(),
      location: newUser.location.trim(),
    });
    if (error) {
      toast.error("Failed to add user");
      return;
    }
    toast.success(`${newUser.name} added successfully`);
    setAddDialogOpen(false);
    setNewUser({ name: "", email: "", mobile: "", college: "", location: "", role: "candidate" });
    window.location.reload();
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    const { error } = await supabase.from("students").delete().eq("id", selectedUser.id);
    if (error) {
      toast.error("Failed to delete user");
      return;
    }
    toast.success(`${selectedUser.name} deleted`);
    setDeleteDialogOpen(false);
    setSelectedUser(null);
    window.location.reload();
  };

  const openEditDialog = (u: StudentData) => {
    setSelectedUser(u);
    setEditUser({ name: u.name, email: u.email, mobile: u.mobile, college: u.college, location: u.location });
    setEditDialogOpen(true);
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;
    if (!editUser.name || !editUser.email || !editUser.mobile || !editUser.college || !editUser.location) {
      toast.error("Please fill all fields");
      return;
    }
    const { error } = await supabase.from("students").update({
      name: editUser.name.trim(),
      email: editUser.email.trim(),
      mobile: editUser.mobile.trim(),
      college: editUser.college.trim(),
      location: editUser.location.trim(),
    }).eq("id", selectedUser.id);
    if (error) {
      toast.error("Failed to update user");
      return;
    }
    toast.success(`${editUser.name} updated`);
    setEditDialogOpen(false);
    setSelectedUser(null);
    window.location.reload();
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    const { error } = await supabase.from("students").update({ password: newPassword }).eq("id", selectedUser.id);
    if (error) {
      toast.error("Failed to reset password");
      return;
    }
    toast.success(`Password reset for ${selectedUser.name}`);
    setResetDialogOpen(false);
    setNewPassword("");
    setSelectedUser(null);
  };

  const handleToggleStatus = async (u: StudentData, makeActive: boolean) => {
    const { error } = await (supabase.from("students") as any)
      .update({ status: makeActive ? "active" : "inactive" })
      .eq("id", u.id);
    if (error) {
      toast.error("Failed to update status");
      return;
    }
    toast.success(`${u.name} marked ${makeActive ? "active" : "inactive"}`);
    setRefreshKey((k) => k + 1);
    window.location.reload();
  };

  const exportCSV = () => {
    const headers = ["Name", "Email", "Institute", "Location", "Mobile", "Progress %", "Modules Completed", "Avg Score %"];
    const rows = filteredUsers.map(s => [s.name, s.email, s.college, s.location, s.mobile, s.progress, s.modulesCompleted, s.avgScore]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activityData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return { date: d.toLocaleDateString("en", { weekday: "short" }), signups: Math.floor(Math.random() * 5) + 1, active: Math.floor(Math.random() * totalStudents * 0.6) };
    });
    return last7Days;
  }, [totalStudents]);

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: totalStudents, icon: Users, color: "text-primary" },
          { label: "Avg Progress", value: `${avgProgress}%`, icon: TrendingUp, color: "text-success" },
          { label: "Avg Score", value: `${avgOverallScore}%`, icon: BarChart3, color: "text-warning" },
          { label: "Active Today", value: Math.floor(totalStudents * 0.6), icon: CheckCircle, color: "text-accent" },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-card rounded-lg border border-border p-4 shadow-card">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`h-4 w-4 ${stat.color}`} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className="text-xl font-display font-bold text-card-foreground">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Activity Chart */}
      <div className="bg-card rounded-lg border border-border p-5 shadow-card">
        <h3 className="font-display font-semibold text-card-foreground mb-4">User Activity (Last 7 Days)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={activityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
            <Line type="monotone" dataKey="active" stroke="hsl(var(--primary))" strokeWidth={2} name="Active Users" />
            <Line type="monotone" dataKey="signups" stroke="hsl(var(--accent))" strokeWidth={2} name="New Signups" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* User Table */}
      <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="font-display font-semibold text-card-foreground">All Users</h3>
            <div className="flex items-center gap-2">
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1 bg-gradient-primary border-0 text-primary-foreground">
                    <UserPlus className="h-3 w-3" /> Add User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Full Name</Label><Input placeholder="Enter name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} /></div>
                    <div><Label>Email</Label><Input type="email" placeholder="user@example.com" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} /></div>
                    <div><Label>Mobile</Label><Input placeholder="10-digit number" maxLength={10} value={newUser.mobile} onChange={(e) => setNewUser({ ...newUser, mobile: e.target.value.replace(/\D/g, "") })} /></div>
                    <div><Label>Institute</Label><Input placeholder="Institute name" value={newUser.college} onChange={(e) => setNewUser({ ...newUser, college: e.target.value })} /></div>
                    <div><Label>Location</Label><Input placeholder="City" value={newUser.location} onChange={(e) => setNewUser({ ...newUser, location: e.target.value })} /></div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
                    <Button className="bg-gradient-primary border-0 text-primary-foreground" onClick={handleAddUser}>Add User</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button
                size="sm"
                className="gap-1 bg-gradient-to-r from-accent to-primary border-0 text-primary-foreground"
                onClick={() => setBulkOpen(true)}
                disabled={selectedIds.size === 0}
                title={selectedIds.size === 0 ? "Select at least one candidate" : `Generate AI paths for ${selectedIds.size} candidate(s)`}
              >
                <Sparkles className="h-3 w-3" /> Generate AI Path
                {selectedIds.size > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{selectedIds.size}</Badge>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-xs"
                onClick={() => setAssignProjectOpen(true)}
                disabled={selectedIds.size === 0}
                title={selectedIds.size === 0 ? "Select at least one candidate" : `Assign project to ${selectedIds.size} candidate(s)`}
              >
                <FolderKanban className="h-3 w-3" /> Assign Project
                {selectedIds.size > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{selectedIds.size}</Badge>
                )}
              </Button>
              <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={exportCSV}>
                <Download className="h-3 w-3" /> Export
              </Button>
            </div>
          </div>

          {/* Filters Row */}
          <div className="mt-3 grid grid-cols-1 md:grid-cols-5 gap-2">
            <Select value={collegeFilter} onValueChange={(v) => { setCollegeFilter(v); clearSelection(); }}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All institutes" /></SelectTrigger>
              <SelectContent className="bg-popover z-50 max-h-72">
                <SelectItem value="all">All institutes</SelectItem>
                {collegeOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={(v) => { setDepartmentFilter(v); clearSelection(); }}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All departments" /></SelectTrigger>
              <SelectContent className="bg-popover z-50 max-h-72">
                <SelectItem value="all">All departments</SelectItem>
                {departmentOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={degreeFilter} onValueChange={(v) => { setDegreeFilter(v); clearSelection(); }}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All degrees" /></SelectTrigger>
              <SelectContent className="bg-popover z-50 max-h-72">
                <SelectItem value="all">All degrees</SelectItem>
                {degreeOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={pathFilter} onValueChange={(v) => { setPathFilter(v); clearSelection(); }}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="AI Path" /></SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">All AI paths</SelectItem>
                <SelectItem value="has">Has path</SelectItem>
                <SelectItem value="none">No path</SelectItem>
                <SelectItem value="beginner">Beginner default</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                className="pl-9 h-9 text-xs"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!e.target.value && onClearSearch) onClearSearch();
                }}
              />
              {initialSearch && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-xs"
                  onClick={() => { setSearchQuery(""); onClearSearch?.(); }}
                >Clear</Button>
              )}
            </div>
          </div>

          {/* Selection summary */}
          {(selectedIds.size > 0 || collegeFilter !== "all" || departmentFilter !== "all" || degreeFilter !== "all") && (
            <div className="mt-3 flex items-center justify-between flex-wrap gap-2 text-xs">
              <div className="text-muted-foreground">
                Showing <span className="font-medium text-foreground">{filteredUsers.length}</span> candidate(s)
                {selectedIds.size > 0 && (
                  <> · <span className="font-medium text-primary">{selectedIds.size}</span> selected</>
                )}
              </div>
              {selectedIds.size > 0 && (
                <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={clearSelection}>
                  <X className="h-3 w-3" /> Clear selection
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="p-4 font-medium w-10">
                  <Checkbox
                    checked={allFilteredSelected ? true : someFilteredSelected ? "indeterminate" : false}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all visible"
                  />
                </th>
                <th className="p-4 font-medium">User</th>
                <th className="p-4 font-medium">Institute</th>
                <th className="p-4 font-medium">Location</th>
                <th className="p-4 font-medium">Progress</th>
                <th className="p-4 font-medium">Score</th>
                <th className="p-4 font-medium">Trainers</th>
                <th className="p-4 font-medium">AI Path</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.length === 0 ? (
                <tr><td colSpan={10} className="p-8 text-center text-sm text-muted-foreground">No users found.</td></tr>
              ) : null}
              {filteredUsers.map((u) => (
                <tr key={u.id} className={`hover:bg-muted/30 transition-colors ${selectedIds.has(u.id) ? "bg-primary/5" : ""}`}>
                  <td className="p-4">
                    <Checkbox
                      checked={selectedIds.has(u.id)}
                      onCheckedChange={() => toggleSelectOne(u.id)}
                      aria-label={`Select ${u.name}`}
                    />
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                        {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <span className="font-medium text-sm text-card-foreground block">{u.name}</span>
                        <span className="text-xs text-muted-foreground">{u.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">{u.college}</td>
                  <td className="p-4 text-sm text-muted-foreground">{u.location}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Progress value={u.progress} className="h-1.5 w-20" />
                      <span className="text-xs font-medium">{u.progress}%</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`text-sm font-medium ${u.avgScore >= 80 ? "text-success" : u.avgScore >= 60 ? "text-warning" : "text-destructive"}`}>
                      {u.avgScore}%
                    </span>
                  </td>
                  <td className="p-4">
                    {(() => {
                      const assignedIds = Array.from(trainerMap[u.id] ?? []);
                      const assignedNames = assignedIds
                        .map(id => trainersList.find(t => t.id === id)?.name)
                        .filter(Boolean) as string[];
                      return (
                        <TooltipProvider delayDuration={150}>
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => openReassign(u)}
                                className="inline-flex items-center gap-1 group"
                              >
                                <Badge variant={assignedIds.length > 0 ? "secondary" : "outline"} className="gap-1">
                                  <UserCog className="h-3 w-3" /> {assignedIds.length}
                                </Badge>
                                <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">Edit</span>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              {assignedNames.length === 0 ? (
                                <p className="text-xs">No trainers assigned. Click to assign.</p>
                              ) : (
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold">Assigned trainers:</p>
                                  <ul className="text-xs space-y-0.5">
                                    {assignedNames.map(n => <li key={n}>• {n}</li>)}
                                  </ul>
                                  <p className="text-[10px] text-muted-foreground pt-1">Click to reassign</p>
                                </div>
                              )}
                            </TooltipContent>
                          </UITooltip>
                        </TooltipProvider>
                      );
                    })()}
                  </td>
                  <td className="p-4">
                    {(() => {
                      const p = pathMap[u.id];
                      if (!p) {
                        return (
                          <Badge variant="outline" className="text-xs text-muted-foreground">None</Badge>
                        );
                      }
                      const date = new Date(p.generated_at);
                      const dateStr = date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "2-digit" });
                      return (
                        <TooltipProvider delayDuration={150}>
                          <UITooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => openPathSheet(u)}
                                className="inline-flex flex-col items-start gap-0.5 group cursor-pointer"
                              >
                                <Badge
                                  variant={p.is_beginner_default ? "outline" : "secondary"}
                                  className="gap-1 text-xs group-hover:ring-2 group-hover:ring-primary/40 transition-all"
                                >
                                  <Sparkles className="h-3 w-3 text-primary" />
                                  {p.is_beginner_default ? "Beginner" : "Active"}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">{dateStr}</span>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="text-xs">
                                {p.is_beginner_default ? "Beginner default path" : "AI-personalized path"}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                Generated {date.toLocaleString()}
                              </p>
                            </TooltipContent>
                          </UITooltip>
                        </TooltipProvider>
                      );
                    })()}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={(statusMap[u.id] ?? "active") === "active"}
                        onCheckedChange={(checked) => handleToggleStatus(u, checked)}
                      />
                      <span className={`text-xs font-medium ${(statusMap[u.id] ?? "active") === "active" ? "text-success" : "text-muted-foreground"}`}>
                        {(statusMap[u.id] ?? "active") === "active" ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-primary" title="View" onClick={() => { setSelectedUser(u); setDetailOpen(true); }}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-accent" title="Edit" onClick={() => openEditDialog(u)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-warning" title="Reset password" onClick={() => { setSelectedUser(u); setNewPassword(""); setResetDialogOpen(true); }}>
                        <KeyRound className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" title="Delete" onClick={() => { setSelectedUser(u); setDeleteDialogOpen(true); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete <strong>{selectedUser?.name}</strong>? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteUser}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Full Name</Label><Input value={editUser.name} onChange={(e) => setEditUser({ ...editUser, name: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={editUser.email} onChange={(e) => setEditUser({ ...editUser, email: e.target.value })} /></div>
            <div><Label>Mobile</Label><Input maxLength={10} value={editUser.mobile} onChange={(e) => setEditUser({ ...editUser, mobile: e.target.value.replace(/\D/g, "") })} /></div>
            <div><Label>Institute</Label><Input value={editUser.college} onChange={(e) => setEditUser({ ...editUser, college: e.target.value })} /></div>
            <div><Label>Location</Label><Input value={editUser.location} onChange={(e) => setEditUser({ ...editUser, location: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button className="bg-gradient-primary border-0 text-primary-foreground" onClick={handleEditUser}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Set a new password for <strong>{selectedUser?.name}</strong>. They will use this on next login.</p>
          <div className="space-y-2">
            <Label>New Password</Label>
            <Input type="text" placeholder="Enter new password (min 6 chars)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>Cancel</Button>
            <Button className="bg-gradient-primary border-0 text-primary-foreground" onClick={handleResetPassword}>Reset Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Detail */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedUser?.name}</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{selectedUser.email}</span></div>
                <div><span className="text-muted-foreground">Mobile:</span> <span className="font-medium">{selectedUser.mobile}</span></div>
                <div><span className="text-muted-foreground">Institute:</span> <span className="font-medium">{selectedUser.college}</span></div>
                <div><span className="text-muted-foreground">Location:</span> <span className="font-medium">{selectedUser.location}</span></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-primary">{selectedUser.progress}%</p>
                  <p className="text-xs text-muted-foreground">Progress</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-accent">{selectedUser.modulesCompleted}/10</p>
                  <p className="text-xs text-muted-foreground">Modules</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className={`text-lg font-bold ${selectedUser.avgScore >= 80 ? "text-success" : selectedUser.avgScore >= 60 ? "text-warning" : "text-destructive"}`}>{selectedUser.avgScore}%</p>
                  <p className="text-xs text-muted-foreground">Avg Score</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Quick Reassign Trainers */}
      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent className="max-w-md max-h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Assign Trainers — {selectedUser?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">{reassignDraft.size} trainer(s) selected</p>
          <div className="flex-1 overflow-y-auto border border-border rounded-md divide-y divide-border">
            {trainersList.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">No trainers registered.</p>
            ) : trainersList.map(t => (
              <label key={t.id} className="flex items-center gap-3 p-3 hover:bg-muted/40 cursor-pointer">
                <Checkbox checked={reassignDraft.has(t.id)} onCheckedChange={() => toggleReassign(t.id)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-card-foreground truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{t.college}</p>
                </div>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignOpen(false)} disabled={savingReassign}>Cancel</Button>
            <Button className="bg-gradient-primary border-0 text-primary-foreground" onClick={saveReassign} disabled={savingReassign}>
              {savingReassign ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Generate AI Path */}
      <Dialog open={bulkOpen} onOpenChange={(o) => !bulkRunning && setBulkOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Generate AI Learning Paths
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              You're about to generate personalized AI learning paths for{" "}
              <span className="font-semibold text-foreground">{selectedIds.size}</span> candidate(s).
            </p>
            <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">College filter:</span><span className="font-medium">{collegeFilter === "all" ? "All" : collegeFilter}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Department filter:</span><span className="font-medium">{departmentFilter === "all" ? "All" : departmentFilter}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Degree filter:</span><span className="font-medium">{degreeFilter === "all" ? "All" : degreeFilter}</span></div>
            </div>
            <label className="flex items-start gap-3 p-3 rounded-md border border-border hover:bg-muted/40 cursor-pointer">
              <Checkbox checked={overwriteExisting} onCheckedChange={(c) => setOverwriteExisting(!!c)} />
              <div>
                <p className="font-medium text-foreground">Regenerate existing paths</p>
                <p className="text-xs text-muted-foreground">If unchecked, candidates who already have an active path will be skipped.</p>
              </div>
            </label>
            <p className="text-xs text-muted-foreground">
              Generation runs in the background. You can close this dialog and continue working — paths will appear in each candidate's dashboard as they finish.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)} disabled={bulkRunning}>Cancel</Button>
            <Button
              className="bg-gradient-to-r from-accent to-primary border-0 text-primary-foreground gap-1"
              onClick={runBulkGenerate}
              disabled={bulkRunning}
            >
              {bulkRunning ? (
                <><Loader2 className="h-3 w-3 animate-spin" /> Starting...</>
              ) : (
                <><Sparkles className="h-3 w-3" /> Start Generation</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Path Detail Side Panel */}
      <Sheet open={pathSheetOpen} onOpenChange={setPathSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Learning Path
            </SheetTitle>
            {pathSheetCandidate && (
              <SheetDescription>
                {pathSheetCandidate.name} · {pathSheetCandidate.email}
              </SheetDescription>
            )}
          </SheetHeader>

          {pathSheetCandidate && (() => {
            const p = pathMap[pathSheetCandidate.id];
            if (!p) {
              return <p className="text-sm text-muted-foreground mt-6">No active path.</p>;
            }
            return (
              <div className="space-y-5 mt-5">
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={p.is_beginner_default ? "outline" : "secondary"} className="gap-1">
                      <Sparkles className="h-3 w-3 text-primary" />
                      {p.is_beginner_default ? "Beginner default" : "AI personalized"}
                    </Badge>
                    {p.model_used && (
                      <Badge variant="outline" className="text-[10px]">{p.model_used}</Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium text-card-foreground">{p.title || "My Personalized Learning Path"}</p>
                  <p className="text-xs text-muted-foreground">
                    Generated {new Date(p.generated_at).toLocaleString()}
                  </p>
                </div>

                {p.rationale && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide mb-2">Rationale</h4>
                    <p className="text-sm text-card-foreground whitespace-pre-wrap leading-relaxed">{p.rationale}</p>
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wide mb-2">
                    Modules ({pathSheetModules.length})
                  </h4>
                  {pathSheetLoading ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-14 rounded-md bg-muted animate-pulse" />
                      ))}
                    </div>
                  ) : pathSheetModules.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No modules in this path.</p>
                  ) : (
                    <ol className="space-y-2">
                      {pathSheetModules.map((m, idx) => (
                        <li key={m.id} className="rounded-md border border-border p-3 bg-card">
                          <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-card-foreground">{m.module_title}</p>
                              {m.reason && (
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{m.reason}</p>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>
            );
          })()}
        </SheetContent>
      </Sheet>

      <AssignProjectDialog
        open={assignProjectOpen}
        onOpenChange={setAssignProjectOpen}
        students={filteredUsers.filter(u => selectedIds.has(u.id)).map(u => ({ id: u.id, name: u.name }))}
        assignerRole="admin"
        assignerId="admin"
        assignerName="Admin"
        onAssigned={() => clearSelection()}
      />
    </div>
  );
};

export default UserManagement;
