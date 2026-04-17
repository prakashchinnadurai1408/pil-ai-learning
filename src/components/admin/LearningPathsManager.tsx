import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLearningPaths, type LearningPath } from "@/hooks/useLearningPaths";
import { modules } from "@/data/modules";
import { useAdminModules } from "@/hooks/useAdminModules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Route, GraduationCap, Building2, BookOpen, Crown, Users, Brain } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AICandidatePathsManager from "./AICandidatePathsManager";

const LearningPathsManager = () => {
  const { paths, loading, refetch } = useLearningPaths();
  const { adminModules } = useAdminModules();
  const publishedAdminModules = adminModules.filter(m => m.status === "published");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPath, setEditingPath] = useState<LearningPath | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requiredTier, setRequiredTier] = useState("free");
  const [selectedModuleIds, setSelectedModuleIds] = useState<number[]>([]);
  const [assignCollege, setAssignCollege] = useState("");
  const [assignDept, setAssignDept] = useState("");
  const [assignDegree, setAssignDegree] = useState("");
  const [colleges, setColleges] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("colleges").select("name").then(({ data }) => {
      setColleges((data || []).map((c: any) => c.name));
    });
  }, []);

  const allModules = [
    ...modules.map(m => ({ id: m.id, title: m.title })),
    ...publishedAdminModules.map(m => ({ id: m.id, title: m.title })),
  ];

  const openCreate = () => {
    setEditingPath(null);
    setTitle("");
    setDescription("");
    setRequiredTier("free");
    setSelectedModuleIds([]);
    setAssignCollege("");
    setAssignDept("");
    setAssignDegree("");
    setDialogOpen(true);
  };

  const openEdit = (p: LearningPath) => {
    setEditingPath(p);
    setTitle(p.title);
    setDescription(p.description);
    setRequiredTier(p.required_tier);
    setSelectedModuleIds(p.modules.map(m => m.module_id));
    const firstAssign = p.assignments[0];
    setAssignCollege(firstAssign?.college || "");
    setAssignDept(firstAssign?.department || "");
    setAssignDegree(firstAssign?.degree || "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (selectedModuleIds.length === 0) { toast.error("Select at least one module"); return; }
    setSaving(true);

    try {
      let pathId: string;
      if (editingPath) {
        await supabase.from("learning_paths").update({
          title, description, required_tier: requiredTier,
        }).eq("id", editingPath.id);
        pathId = editingPath.id;

        // Clear old modules & assignments
        await supabase.from("learning_path_modules").delete().eq("path_id", pathId);
        await supabase.from("learning_path_assignments").delete().eq("path_id", pathId);
      } else {
        const { data, error } = await supabase.from("learning_paths").insert({
          title, description, required_tier: requiredTier, status: "draft",
        }).select("id").single();
        if (error) throw error;
        pathId = data.id;
      }

      // Insert modules
      const moduleRows = selectedModuleIds.map((mid, i) => ({
        path_id: pathId, module_id: mid, sort_order: i,
      }));
      await supabase.from("learning_path_modules").insert(moduleRows);

      // Insert assignment if college specified
      if (assignCollege.trim()) {
        await supabase.from("learning_path_assignments").insert({
          path_id: pathId,
          college: assignCollege.trim(),
          department: assignDept.trim(),
          degree: assignDegree.trim(),
        });
      }

      toast.success(editingPath ? "Learning path updated" : "Learning path created");
      setDialogOpen(false);
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (p: LearningPath) => {
    const newStatus = p.status === "published" ? "draft" : "published";
    await supabase.from("learning_paths").update({ status: newStatus }).eq("id", p.id);
    toast.success(`Path ${newStatus === "published" ? "published" : "unpublished"}`);
    refetch();
  };

  const deletePath = async (id: string) => {
    await supabase.from("learning_paths").delete().eq("id", id);
    toast.success("Learning path deleted");
    refetch();
  };

  const toggleModule = (id: number) => {
    setSelectedModuleIds(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <Route className="h-5 w-5 text-primary" /> Learning Paths
          </h2>
          <p className="text-sm text-muted-foreground">Group modules into cohort-based learning paths with access controls</p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Create Path</Button>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2].map(i => <div key={i} className="h-32 bg-muted rounded-lg" />)}
        </div>
      ) : paths.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Route className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>No learning paths created yet. Create one to organize modules for your students.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {paths.map(p => (
            <Card key={p.id} className="border-border">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {p.title}
                      <Badge variant={p.status === "published" ? "default" : "secondary"}>
                        {p.status}
                      </Badge>
                      {p.required_tier === "premium" && (
                        <Badge variant="outline" className="text-warning border-warning/30">
                          <Crown className="h-3 w-3 mr-1" /> Premium
                        </Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{p.description}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => toggleStatus(p)}>
                      {p.status === "published" ? "Unpublish" : "Publish"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deletePath(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{p.modules.length} modules:</span>
                  {p.modules.map(pm => {
                    const mod = allModules.find(m => m.id === pm.module_id);
                    return <Badge key={pm.id} variant="outline" className="text-xs">{mod?.title || `#${pm.module_id}`}</Badge>;
                  })}
                </div>
                {p.assignments.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Assigned to:</span>
                    {p.assignments.map(a => (
                      <Badge key={a.id} variant="outline" className="text-xs">
                        {[a.college, a.department, a.degree].filter(Boolean).join(" · ")}
                      </Badge>
                    ))}
                  </div>
                )}
                {p.assignments.length === 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <GraduationCap className="h-4 w-4" /> Available to all students
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPath ? "Edit Learning Path" : "Create Learning Path"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Title</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. AI Fundamentals Track" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Description</label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe this learning path..." rows={2} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Required Tier</label>
              <Select value={requiredTier} onValueChange={setRequiredTier}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free (accessible to all)</SelectItem>
                  <SelectItem value="premium">Premium only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Select Modules</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-border rounded-lg p-3">
                {allModules.map(m => (
                  <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1.5 rounded">
                    <Checkbox
                      checked={selectedModuleIds.includes(m.id)}
                      onCheckedChange={() => toggleModule(m.id)}
                    />
                    <span className="text-foreground">{m.title}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{selectedModuleIds.length} selected</p>
            </div>

            <div className="border-t border-border pt-4">
              <label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Cohort Assignment (optional)
              </label>
              <p className="text-xs text-muted-foreground mb-3">Leave empty to make available to all students</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">College</label>
                  <Select value={assignCollege} onValueChange={setAssignCollege}>
                    <SelectTrigger><SelectValue placeholder="All colleges" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All colleges</SelectItem>
                      {colleges.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Department</label>
                  <Input value={assignDept} onChange={e => setAssignDept(e.target.value)} placeholder="e.g. CSE" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Degree</label>
                  <Input value={assignDegree} onChange={e => setAssignDegree(e.target.value)} placeholder="e.g. B.Tech" />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingPath ? "Update Path" : "Create Path"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LearningPathsManager;
