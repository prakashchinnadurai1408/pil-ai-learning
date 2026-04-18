import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useModuleGroups, type ModuleGroup } from "@/hooks/useModuleGroups";
import { useAdminModules } from "@/hooks/useAdminModules";
import { modules } from "@/data/modules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Layers, BookOpen, Building2, User, Users, Sparkles, ArrowRightLeft, Loader2 } from "lucide-react";

interface ModuleGroupsManagerProps {
  /** "admin" or "trainer". If trainer, ownerId/ownerName must be set + can only assign to their students. */
  ownerRole: "admin" | "trainer";
  ownerId: string;
  ownerName: string;
  /** For trainer mode: list of student IDs they can scope to. */
  scopedStudents?: { id: string; name: string }[];
}

const ModuleGroupsManager = ({ ownerRole, ownerId, ownerName, scopedStudents = [] }: ModuleGroupsManagerProps) => {
  const { groups, loading, refetch } = useModuleGroups({ ownerRole, ownerId });
  const { adminModules } = useAdminModules();
  const publishedAdminModules = adminModules.filter((m) => m.status === "published");
  const allModules = [
    ...modules.map((m) => ({ id: m.id, title: m.title })),
    ...publishedAdminModules.map((m) => ({ id: m.id, title: m.title })),
  ];

  const [colleges, setColleges] = useState<string[]>([]);
  useEffect(() => {
    supabase.from("colleges").select("name").then(({ data }) => {
      setColleges((data || []).map((c: any) => c.name));
    });
  }, []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ModuleGroup | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedModuleIds, setSelectedModuleIds] = useState<number[]>([]);
  // Cohort scope (admin)
  const [scopeCollege, setScopeCollege] = useState("");
  const [scopeDept, setScopeDept] = useState("");
  const [scopeDegree, setScopeDegree] = useState("");
  // Student scope (trainer)
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setName(""); setDescription(""); setSelectedModuleIds([]);
    setScopeCollege(""); setScopeDept(""); setScopeDegree("");
    setSelectedStudentIds([]);
    setDialogOpen(true);
  };

  const openEdit = (g: ModuleGroup) => {
    setEditing(g);
    setName(g.name);
    setDescription(g.description);
    setSelectedModuleIds(g.items.map((i) => i.module_id));
    const cohort = g.assignments.find((a) => a.scope_type === "cohort");
    setScopeCollege(cohort?.college || "");
    setScopeDept(cohort?.department || "");
    setScopeDegree(cohort?.degree || "");
    setSelectedStudentIds(g.assignments.filter((a) => a.scope_type === "student").map((a) => a.student_id || ""));
    setDialogOpen(true);
  };

  const save = async () => {
    if (!name.trim()) return toast.error("Name is required");
    if (selectedModuleIds.length === 0) return toast.error("Select at least one module");
    setSaving(true);
    try {
      let groupId: string;
      if (editing) {
        await (supabase as any).from("module_groups").update({
          name, description, updated_at: new Date().toISOString(),
        }).eq("id", editing.id);
        groupId = editing.id;
        await (supabase as any).from("module_group_items").delete().eq("group_id", groupId);
        await (supabase as any).from("module_group_assignments").delete().eq("group_id", groupId);
      } else {
        const { data, error } = await (supabase as any).from("module_groups").insert({
          name, description, owner_role: ownerRole, owner_id: ownerId, owner_name: ownerName, status: "published",
        }).select("id").single();
        if (error) throw error;
        groupId = data.id;
      }

      const items = selectedModuleIds.map((mid, i) => {
        const mod = allModules.find((m) => m.id === mid);
        return { group_id: groupId, module_id: mid, module_title: mod?.title || `Module ${mid}`, sort_order: i };
      });
      await (supabase as any).from("module_group_items").insert(items);

      const assignmentRows: any[] = [];
      if (ownerRole === "admin") {
        if (scopeCollege.trim() || scopeDept.trim() || scopeDegree.trim()) {
          assignmentRows.push({
            group_id: groupId, scope_type: "cohort",
            college: scopeCollege.trim(), department: scopeDept.trim(), degree: scopeDegree.trim(),
          });
        } else {
          // Empty cohort = global (matches everyone)
          assignmentRows.push({ group_id: groupId, scope_type: "cohort" });
        }
      } else {
        // Trainer: assign per selected students
        if (selectedStudentIds.length === 0) {
          toast.error("Select at least one student to assign this group to");
          setSaving(false); return;
        }
        for (const sid of selectedStudentIds) {
          assignmentRows.push({ group_id: groupId, scope_type: "student", student_id: sid });
        }
      }
      if (assignmentRows.length > 0) await (supabase as any).from("module_group_assignments").insert(assignmentRows);

      toast.success(editing ? "Group updated" : "Group created");
      setDialogOpen(false);
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Failed to save group");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this group?")) return;
    await (supabase as any).from("module_groups").delete().eq("id", id);
    toast.success("Group deleted");
    refetch();
  };

  const toggleModule = (id: number) => {
    setSelectedModuleIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };
  const toggleStudent = (id: string) => {
    setSelectedStudentIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  // ----- AI Auto-Group -----
  const [aiOpen, setAiOpen] = useState(false);
  const [aiHint, setAiHint] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{ name: string; description: string; module_ids: number[] }[]>([]);
  const [aiAccept, setAiAccept] = useState<Set<number>>(new Set());

  const runAISuggest = async () => {
    setAiLoading(true);
    try {
      const { data, error } = await (supabase as any).functions.invoke("ai-group-modules", {
        body: { modules: allModules, hint: aiHint },
      });
      if (error) throw error;
      const sugs = (data?.groups || []).filter((g: any) => Array.isArray(g.module_ids) && g.module_ids.length);
      if (sugs.length === 0) { toast.error("AI returned no groups"); return; }
      setAiSuggestions(sugs);
      setAiAccept(new Set(sugs.map((_: any, i: number) => i)));
    } catch (e: any) {
      toast.error(e.message || "AI grouping failed");
    } finally { setAiLoading(false); }
  };

  const applyAISuggestions = async () => {
    const accepted = aiSuggestions.filter((_, i) => aiAccept.has(i));
    if (accepted.length === 0) { toast.error("Select at least one group"); return; }
    setAiLoading(true);
    try {
      for (const sug of accepted) {
        const { data, error } = await (supabase as any).from("module_groups").insert({
          name: sug.name, description: sug.description || "",
          owner_role: ownerRole, owner_id: ownerId, owner_name: ownerName, status: "published",
        }).select("id").single();
        if (error) throw error;
        const gid = data.id;
        const items = sug.module_ids.map((mid, i) => {
          const mod = allModules.find((m) => m.id === mid);
          return { group_id: gid, module_id: mid, module_title: mod?.title || `Module ${mid}`, sort_order: i };
        });
        await (supabase as any).from("module_group_items").insert(items);
        // Default cohort = visible to all (admin) — trainer can edit later
        if (ownerRole === "admin") {
          await (supabase as any).from("module_group_assignments").insert({ group_id: gid, scope_type: "cohort" });
        }
      }
      toast.success(`Created ${accepted.length} group(s) from AI suggestions`);
      setAiOpen(false); setAiSuggestions([]); setAiAccept(new Set()); setAiHint("");
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Failed to apply suggestions");
    } finally { setAiLoading(false); }
  };

  // ----- Manual Move -----
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveSrcGroupId, setMoveSrcGroupId] = useState("");
  const [moveModuleId, setMoveModuleId] = useState<string>("");
  const [moveDstGroupId, setMoveDstGroupId] = useState("");

  const openMove = (srcGroupId?: string) => {
    setMoveSrcGroupId(srcGroupId || "");
    setMoveModuleId(""); setMoveDstGroupId("");
    setMoveOpen(true);
  };

  const performMove = async () => {
    if (!moveSrcGroupId || !moveModuleId || !moveDstGroupId) {
      toast.error("Select source group, module, and destination group");
      return;
    }
    if (moveSrcGroupId === moveDstGroupId) { toast.error("Source and destination must differ"); return; }
    const mid = Number(moveModuleId);
    const src = groups.find((g) => g.id === moveSrcGroupId);
    const dst = groups.find((g) => g.id === moveDstGroupId);
    const item = src?.items.find((i) => i.module_id === mid);
    if (!item) { toast.error("Module not found in source"); return; }
    if (dst?.items.some((i) => i.module_id === mid)) {
      toast.error("Module already exists in destination group");
      return;
    }
    try {
      // Delete from source, insert into destination
      await (supabase as any).from("module_group_items").delete().eq("id", item.id);
      const nextOrder = (dst?.items.length || 0);
      await (supabase as any).from("module_group_items").insert({
        group_id: moveDstGroupId, module_id: mid, module_title: item.module_title, sort_order: nextOrder,
      });
      toast.success("Module moved");
      setMoveOpen(false);
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Move failed");
    }
  };


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" /> Module Groups
          </h2>
          <p className="text-sm text-muted-foreground">
            {ownerRole === "admin"
              ? "Group modules into themed bundles (e.g. 'Semester 1', 'GenAI Track') and assign to institutes/departments."
              : "Organize modules into bundles for your assigned candidates."}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> New Group</Button>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2].map((i) => <div key={i} className="h-32 bg-muted rounded-lg" />)}
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Layers className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>No module groups yet. Create one to organize modules into bundles.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {groups.map((g) => (
            <Card key={g.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {g.name}
                      <Badge variant="outline" className="text-xs">{g.items.length} modules</Badge>
                    </CardTitle>
                    {g.description && <p className="text-xs text-muted-foreground mt-1">{g.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(g)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(g.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-muted-foreground mt-1" />
                  {g.items.slice(0, 6).map((it) => (
                    <Badge key={it.id} variant="secondary" className="text-[10px]">{it.module_title}</Badge>
                  ))}
                  {g.items.length > 6 && <Badge variant="secondary" className="text-[10px]">+{g.items.length - 6}</Badge>}
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                  {g.assignments.length === 0 ? (
                    <span className="italic">No assignments</span>
                  ) : g.assignments.some((a) => a.scope_type === "cohort") ? (
                    <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" />
                      {g.assignments
                        .filter((a) => a.scope_type === "cohort")
                        .map((a) => [a.college, a.department, a.degree].filter(Boolean).join(" · ") || "All students")
                        .join(" | ")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3" /> {g.assignments.filter((a) => a.scope_type === "student").length} student(s)
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Module Group" : "Create Module Group"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Semester 1 — AI Foundations" />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Modules</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-border rounded-lg p-3">
                {allModules.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1.5 rounded">
                    <Checkbox checked={selectedModuleIds.includes(m.id)} onCheckedChange={() => toggleModule(m.id)} />
                    <span>{m.title}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{selectedModuleIds.length} selected</p>
            </div>

            {ownerRole === "admin" ? (
              <div className="border-t pt-4">
                <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> Cohort assignment (leave empty = visible to all)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Institute</label>
                    <Select value={scopeCollege || "__all__"} onValueChange={(v) => setScopeCollege(v === "__all__" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="All institutes" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All institutes</SelectItem>
                        {colleges.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Department</label>
                    <Input value={scopeDept} onChange={(e) => setScopeDept(e.target.value)} placeholder="e.g. CSE" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Degree</label>
                    <Input value={scopeDegree} onChange={(e) => setScopeDegree(e.target.value)} placeholder="e.g. B.Tech" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-t pt-4">
                <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                  <User className="h-4 w-4" /> Assign to your candidates
                </label>
                {scopedStudents.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No candidates mapped to you yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-border rounded-lg p-3">
                    {scopedStudents.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1.5 rounded">
                        <Checkbox checked={selectedStudentIds.includes(s.id)} onCheckedChange={() => toggleStudent(s.id)} />
                        <span>{s.name}</span>
                      </label>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">{selectedStudentIds.length} candidate(s) selected</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModuleGroupsManager;
