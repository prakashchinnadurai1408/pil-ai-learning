import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Users, UserCheck, Building2 } from "lucide-react";
import { toast } from "sonner";

interface Trainer { id: string; name: string; email: string; college: string; }
interface Student { id: string; name: string; email: string; college: string; }

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

  const load = async () => {
    setLoading(true);
    const [{ data: t }, { data: s }, { data: a }] = await Promise.all([
      supabase.from("trainers").select("id, name, email, college"),
      supabase.from("students").select("id, name, email, college"),
      (supabase as any).from("trainer_students").select("trainer_id, student_id"),
    ]);
    setTrainers(t || []);
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

  const colleges = useMemo(
    () => Array.from(new Set(students.map(s => s.college).filter(Boolean))).sort(),
    [students]
  );

  const addCollegeStudents = () => {
    if (!bulkCollege) return;
    const ids = students.filter(s => s.college === bulkCollege).map(s => s.id);
    if (ids.length === 0) { toast.info("No students from that college"); return; }
    setDraft(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      return next;
    });
    toast.success(`Added ${ids.length} students from ${bulkCollege}`);
  };

  const filteredStudents = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return students;
    return students.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.college.toLowerCase().includes(q)
    );
  }, [students, search]);

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
      <div>
        <h2 className="text-xl font-display font-semibold text-card-foreground">Trainer ↔ Student Assignments</h2>
        <p className="text-sm text-muted-foreground">Assign which candidates each trainer can see and manage.</p>
      </div>

      <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr className="text-left text-xs text-muted-foreground">
              <th className="p-4 font-medium">Trainer</th>
              <th className="p-4 font-medium">Email</th>
              <th className="p-4 font-medium">Institute</th>
              <th className="p-4 font-medium">Assigned</th>
              <th className="p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {trainers.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">No trainers registered yet.</td></tr>
            )}
            {trainers.map(t => {
              const count = assignments[t.id]?.size ?? 0;
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
                    <Badge variant="secondary" className="gap-1">
                      <Users className="h-3 w-3" /> {count}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => openDialog(t)}>
                      <UserCheck className="h-3 w-3" /> Assign Students
                    </Button>
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
            <span className="text-xs text-muted-foreground whitespace-nowrap">Bulk add by college:</span>
            <Select value={bulkCollege} onValueChange={setBulkCollege}>
              <SelectTrigger className="h-8 flex-1 text-xs"><SelectValue placeholder="Select a college..." /></SelectTrigger>
              <SelectContent>
                {colleges.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="secondary" onClick={addCollegeStudents} disabled={!bulkCollege}>
              Add all
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">{draft.size} selected • {filteredStudents.length} shown</p>

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
    </div>
  );
};

export default TrainerAssignments;
