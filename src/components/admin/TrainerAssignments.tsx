import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Search, Users, UserCheck, Building2, UserPlus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { TIERS, TIER_META, type Tier } from "@/hooks/useMenuAccessControls";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Trainer { id: string; name: string; email: string; college: string; subscription_tier?: string; }
interface Student { id: string; name: string; email: string; college: string; }

const normalizeTier = (raw: any): Tier => {
  const v = String(raw || "free").toLowerCase();
  if (v === "premium" || v === "pro") return "advanced";
  if ((TIERS as string[]).includes(v)) return v as Tier;
  return "free";
};

const TrainerAssignments = () => {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Record<string, Set<string>>>({}); // trainerId -> set of studentIds
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [activeTrainer, setActiveTrainer] = useState<Trainer | null>(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const [bulkCollege, setBulkCollege] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newTrainer, setNewTrainer] = useState({
    name: "", email: "", mobile: "", college: "", location: "", password: "", subscription_tier: "free" as Tier,
  });
  const [editTrainer, setEditTrainer] = useState<Trainer | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", mobile: "", college: "", location: "", password: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Trainer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: t }, { data: s }, { data: a }] = await Promise.all([
      supabase.from("trainers").select("id, name, email, college, subscription_tier"),
      supabase.from("students").select("id, name, email, college"),
      (supabase as any).from("trainer_students").select("trainer_id, student_id"),
    ]);
    setTrainers((t || []) as any);
    setStudents(s || []);
    const map: Record<string, Set<string>> = {};
    (a || []).forEach((row: any) => {
      if (!map[row.trainer_id]) map[row.trainer_id] = new Set();
      map[row.trainer_id].add(row.student_id);
    });
    setAssignments(map);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openDialog = (t: Trainer) => {
    setActiveTrainer(t);
    setDraft(new Set(assignments[t.id] || []));
    setSearch("");
    setBulkCollege("");
    setOpen(true);
  };

  // Students assigned to OTHER trainers should be hidden in the dialog
  const assignedToOthers = useMemo(() => {
    const set = new Set<string>();
    Object.entries(assignments).forEach(([tid, ids]) => {
      if (tid !== activeTrainer?.id) ids.forEach(id => set.add(id));
    });
    return set;
  }, [assignments, activeTrainer]);

  const availableStudents = useMemo(
    () => students.filter(s => !assignedToOthers.has(s.id)),
    [students, assignedToOthers]
  );

  const colleges = useMemo(
    () => Array.from(new Set(availableStudents.map(s => s.college).filter(Boolean))).sort(),
    [availableStudents]
  );

  const addCollegeStudents = () => {
    if (!bulkCollege) return;
    const ids = availableStudents.filter(s => s.college === bulkCollege).map(s => s.id);
    if (ids.length === 0) { toast.info("No unassigned students from that institute"); return; }
    setDraft(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      return next;
    });
    toast.success(`Added ${ids.length} students from ${bulkCollege}`);
  };

  const filteredStudents = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return availableStudents;
    return availableStudents.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.college.toLowerCase().includes(q)
    );
  }, [availableStudents, search]);

  const addTrainer = async () => {
    const t = newTrainer;
    if (!t.name.trim() || !t.email.trim() || !t.mobile.trim() || !t.college.trim() || !t.location.trim()) {
      toast.error("Name, email, mobile, college and location are required");
      return;
    }
    setAdding(true);
    const { error } = await supabase.from("trainers").insert({
      name: t.name.trim(), email: t.email.trim(), mobile: t.mobile.trim(),
      college: t.college.trim(), location: t.location.trim(),
      password: t.password || "trainer123", subscription_tier: t.subscription_tier,
    });
    setAdding(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Trainer ${t.name} added on ${TIER_META[t.subscription_tier].label} plan`);
    setAddOpen(false);
    setNewTrainer({ name: "", email: "", mobile: "", college: "", location: "", password: "", subscription_tier: "free" });
    await load();
  };

  const openEdit = (t: Trainer) => {
    setEditForm({
      name: t.name || "", email: t.email || "",
      mobile: (t as any).mobile || "", college: t.college || "",
      location: (t as any).location || "", password: "",
    });
    setEditTrainer(t);
  };

  const saveEdit = async () => {
    if (!editTrainer) return;
    if (!editForm.name.trim() || !editForm.email.trim()) {
      toast.error("Name and email are required"); return;
    }
    if (editForm.password && editForm.password.length < 6) {
      toast.error("New password must be at least 6 characters"); return;
    }
    setSavingEdit(true);
    const update: any = {
      name: editForm.name.trim(), email: editForm.email.trim(),
      mobile: editForm.mobile.trim(), college: editForm.college.trim(),
      location: editForm.location.trim(),
    };
    if (editForm.password.trim()) update.password = editForm.password.trim();
    const { error } = await (supabase as any).from("trainers").update(update).eq("id", editTrainer.id);
    setSavingEdit(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editForm.password.trim() ? `Updated ${editForm.name} (password reset)` : `Updated ${editForm.name}`);
    setEditTrainer(null);
    await load();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await (supabase as any).from("trainer_students").delete().eq("trainer_id", deleteTarget.id);
    const { error } = await (supabase as any).from("trainers").delete().eq("id", deleteTarget.id);
    setDeleting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Removed ${deleteTarget.name} and their student mappings`);
    setDeleteTarget(null);
    await load();
  };

  const toggle = (id: string) => {
    setDraft(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setDraft(prev => {
      const next = new Set(prev);
      filteredStudents.forEach(s => next.add(s.id));
      return next;
    });
  };

  const clearAllVisible = () => {
    setDraft(prev => {
      const next = new Set(prev);
      filteredStudents.forEach(s => next.delete(s.id));
      return next;
    });
  };

  const save = async () => {
    if (!activeTrainer) return;
    setSaving(true);
    const existing = assignments[activeTrainer.id] || new Set<string>();
    const toAdd: string[] = [];
    const toRemove: string[] = [];
    draft.forEach(id => { if (!existing.has(id)) toAdd.push(id); });
    existing.forEach(id => { if (!draft.has(id)) toRemove.push(id); });

    if (toRemove.length > 0) {
      await (supabase as any).from("trainer_students")
        .delete().eq("trainer_id", activeTrainer.id).in("student_id", toRemove);
    }
    if (toAdd.length > 0) {
      await (supabase as any).from("trainer_students").insert(
        toAdd.map(student_id => ({ trainer_id: activeTrainer.id, student_id }))
      );
    }
    toast.success(`Saved assignments for ${activeTrainer.name}`);
    setSaving(false);
    setOpen(false);
    await load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-semibold text-card-foreground">Trainer ↔ Student Assignments</h2>
          <p className="text-sm text-muted-foreground">Assign which candidates each trainer can see and manage.</p>
        </div>
        <Button className="gap-2 bg-gradient-primary border-0 text-primary-foreground" onClick={() => setAddOpen(true)}>
          <UserPlus className="h-4 w-4" /> Add Trainer
        </Button>
      </div>

      <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr className="text-left text-xs text-muted-foreground">
              <th className="p-4 font-medium">Trainer</th>
              <th className="p-4 font-medium">Email</th>
              <th className="p-4 font-medium">Institute</th>
              <th className="p-4 font-medium">Plan</th>
              <th className="p-4 font-medium">Assigned</th>
              <th className="p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {trainers.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">No trainers registered yet.</td></tr>
            )}
            {trainers.map(t => {
              const count = assignments[t.id]?.size ?? 0;
              const currentTier = normalizeTier(t.subscription_tier);
              const setTier = async (newTier: Tier) => {
                setTrainers(prev => prev.map(x => x.id === t.id ? { ...x, subscription_tier: newTier } : x));
                const { error } = await (supabase as any).from("trainers")
                  .update({ subscription_tier: newTier }).eq("id", t.id);
                if (error) { toast.error("Failed to update plan"); load(); }
                else toast.success(`${t.name} → ${TIER_META[newTier].label}`);
              };
              return (
                <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-accent flex items-center justify-center text-xs font-bold text-accent-foreground">
                        {t.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <span className="font-medium text-sm text-card-foreground">{t.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">{t.email}</td>
                  <td className="p-4 text-sm text-muted-foreground">{t.college}</td>
                  <td className="p-4">
                    <Select value={currentTier} onValueChange={(v) => setTier(v as Tier)}>
                      <SelectTrigger className={`h-8 w-[140px] text-xs ${TIER_META[currentTier].color}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {TIERS.map((tt) => (
                          <SelectItem key={tt} value={tt} className="text-xs">
                            <span className={TIER_META[tt].color}>{TIER_META[tt].label}</span>
                            <span className="text-muted-foreground ml-2">{TIER_META[tt].price}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-4">
                    <Badge variant="secondary" className="gap-1">
                      <Users className="h-3 w-3" /> {count}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => openDialog(t)}>
                        <UserCheck className="h-3 w-3" /> Assign
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => openEdit(t)}>
                        <Pencil className="h-3 w-3" /> Edit
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1 text-xs text-destructive hover:text-destructive" onClick={() => setDeleteTarget(t)}>
                        <Trash2 className="h-3 w-3" /> Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Assign students to {activeTrainer?.name}</DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9 h-9" placeholder="Search students by name, email or institute..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button variant="ghost" size="sm" onClick={selectAllVisible}>Select all</Button>
            <Button variant="ghost" size="sm" onClick={clearAllVisible}>Clear</Button>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30 border border-border">
            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">Bulk add by institute:</span>
            <Select value={bulkCollege} onValueChange={setBulkCollege}>
              <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue placeholder="Select an institute..." /></SelectTrigger>
              <SelectContent>
                {colleges.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="secondary" onClick={addCollegeStudents} disabled={!bulkCollege}>
              Add all
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            {draft.size} selected • {filteredStudents.length} unassigned shown
            {assignedToOthers.size > 0 && ` • ${assignedToOthers.size} hidden (already assigned to other trainers)`}
          </p>

          <div className="flex-1 overflow-y-auto border border-border rounded-md divide-y divide-border">
            {filteredStudents.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">No students match.</p>
            ) : filteredStudents.map(s => (
              <label key={s.id} className="flex items-center gap-3 p-3 hover:bg-muted/40 cursor-pointer">
                <Checkbox checked={draft.has(s.id)} onCheckedChange={() => toggle(s.id)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-card-foreground truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.email} • {s.college}</p>
                </div>
              </label>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button className="bg-gradient-primary border-0 text-primary-foreground" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save assignments"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" /> Add New Trainer
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Name *</Label>
                <Input value={newTrainer.name} onChange={e => setNewTrainer(p => ({ ...p, name: e.target.value }))} placeholder="Full name" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Mobile *</Label>
                <Input value={newTrainer.mobile} onChange={e => setNewTrainer(p => ({ ...p, mobile: e.target.value }))} placeholder="10-digit mobile" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email *</Label>
              <Input type="email" value={newTrainer.email} onChange={e => setNewTrainer(p => ({ ...p, email: e.target.value }))} placeholder="trainer@institute.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Institute *</Label>
                <Input value={newTrainer.college} onChange={e => setNewTrainer(p => ({ ...p, college: e.target.value }))} placeholder="College / Org" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Location *</Label>
                <Input value={newTrainer.location} onChange={e => setNewTrainer(p => ({ ...p, location: e.target.value }))} placeholder="City" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Initial password</Label>
              <Input value={newTrainer.password} onChange={e => setNewTrainer(p => ({ ...p, password: e.target.value }))} placeholder="Default: trainer123" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Subscription Plan</Label>
              <Select value={newTrainer.subscription_tier} onValueChange={(v) => setNewTrainer(p => ({ ...p, subscription_tier: v as Tier }))}>
                <SelectTrigger className={TIER_META[newTrainer.subscription_tier].color}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {TIERS.map(tt => (
                    <SelectItem key={tt} value={tt}>
                      <span className={TIER_META[tt].color}>{TIER_META[tt].label}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{TIER_META[tt].price}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={adding}>Cancel</Button>
            <Button className="bg-gradient-primary border-0 text-primary-foreground" onClick={addTrainer} disabled={adding}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Trainer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTrainer} onOpenChange={(o) => !o && setEditTrainer(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" /> Edit Trainer
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Name *</Label>
                <Input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Mobile</Label>
                <Input value={editForm.mobile} onChange={e => setEditForm(p => ({ ...p, mobile: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email *</Label>
              <Input type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Institute</Label>
                <Input value={editForm.college} onChange={e => setEditForm(p => ({ ...p, college: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Location</Label>
                <Input value={editForm.location} onChange={e => setEditForm(p => ({ ...p, location: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1 pt-2 border-t border-border">
              <Label className="text-xs flex items-center justify-between">
                <span>Reset password</span>
                <span className="text-muted-foreground font-normal">Leave blank to keep current</span>
              </Label>
              <Input
                type="text"
                value={editForm.password}
                onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))}
                placeholder="New password (min 6 chars)"
                autoComplete="new-password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTrainer(null)} disabled={savingEdit}>Cancel</Button>
            <Button className="bg-gradient-primary border-0 text-primary-foreground" onClick={saveEdit} disabled={savingEdit}>
              {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete trainer {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the trainer and unassign all{" "}
              <strong>{deleteTarget ? (assignments[deleteTarget.id]?.size ?? 0) : 0}</strong> mapped students.
              The students themselves will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete trainer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TrainerAssignments;
