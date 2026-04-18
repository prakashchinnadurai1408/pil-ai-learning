import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FolderKanban, BookOpen, PenLine, Briefcase } from "lucide-react";
import { techStream, nonTechStream, mbaCaseStudyStream } from "@/data/projectGuideData";

interface Student { id: string; name: string }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  students: Student[];
  assignerRole: "admin" | "trainer";
  assignerId: string;
  assignerName: string;
  onAssigned?: () => void;
}

const STREAMS = [
  { id: "tech", title: "Tech Project (8 steps)", description: "Software / IT / Engineering — full project lifecycle" },
  { id: "non-tech", title: "Non-Tech Project", description: nonTechStream.subtitle },
  { id: "mba-casestudy", title: "MBA Case Study (10 steps)", description: mbaCaseStudyStream.subtitle },
];

const AssignProjectDialog = ({ open, onOpenChange, students, assignerRole, assignerId, assignerName, onAssigned }: Props) => {
  const [mode, setMode] = useState<"guide" | "custom">("guide");
  const [streamId, setStreamId] = useState<string>("tech");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setMode("guide"); setStreamId("tech"); setTitle(""); setDescription(""); setDueDate(""); setSelected([]);
  };

  const toggle = (id: string) => setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const toggleAll = () => setSelected((p) => (p.length === students.length ? [] : students.map((s) => s.id)));

  const submit = async () => {
    if (selected.length === 0) return toast.error("Select at least one candidate");
    let finalTitle = title.trim();
    let finalDesc = description.trim();
    if (mode === "guide") {
      const stream = STREAMS.find((s) => s.id === streamId)!;
      if (!title.trim()) finalTitle = stream.title;
      if (!description.trim()) finalDesc = stream.description;
    } else {
      if (!finalTitle) return toast.error("Project title is required");
    }

    setSaving(true);
    try {
      const rows = selected.map((sid) => {
        const stu = students.find((s) => s.id === sid)!;
        return {
          assigner_role: assignerRole,
          assigner_id: assignerId,
          assigner_name: assignerName,
          student_id: sid,
          student_name: stu.name,
          source_type: mode,
          stream_id: mode === "guide" ? streamId : "",
          title: finalTitle,
          description: finalDesc,
          due_date: dueDate || null,
          status: "assigned",
        };
      });
      const { error } = await (supabase as any).from("project_assignments").insert(rows);
      if (error) throw error;
      toast.success(`Project assigned to ${selected.length} candidate(s)`);
      reset();
      onOpenChange(false);
      onAssigned?.();
    } catch (e: any) {
      toast.error(e.message || "Failed to assign");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-primary" /> Assign Project
          </DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="guide" className="gap-2"><BookOpen className="h-3.5 w-3.5" /> Pick from Guide</TabsTrigger>
            <TabsTrigger value="custom" className="gap-2"><PenLine className="h-3.5 w-3.5" /> Custom Project</TabsTrigger>
          </TabsList>

          <TabsContent value="guide" className="space-y-3 mt-4">
            <div>
              <label className="text-sm font-medium">Stream</label>
              <Select value={streamId} onValueChange={setStreamId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STREAMS.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div>
                        <div className="font-medium">{s.title}</div>
                        <div className="text-xs text-muted-foreground">{s.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Title (optional override)</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Defaults to stream name" />
            </div>
            <div>
              <label className="text-sm font-medium">Notes for candidate (optional)</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Specific topic, focus area, expectations..." />
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-3 mt-4">
            <div>
              <label className="text-sm font-medium">Project Title *</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Build a hospital appointment app" />
            </div>
            <div>
              <label className="text-sm font-medium">Project Brief</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Goals, scope, deliverables, evaluation criteria..." />
            </div>
          </TabsContent>
        </Tabs>

        <div>
          <label className="text-sm font-medium">Due Date (optional)</label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-fit" />
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Briefcase className="h-4 w-4" /> Assign to candidates
            </label>
            <Button size="sm" variant="ghost" onClick={toggleAll} className="text-xs h-7">
              {selected.length === students.length ? "Clear all" : "Select all"}
            </Button>
          </div>
          {students.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No candidates available.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-border rounded-lg p-3">
              {students.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-1.5 rounded">
                  <Checkbox checked={selected.includes(s.id)} onCheckedChange={() => toggle(s.id)} />
                  <span>{s.name}</span>
                </label>
              ))}
            </div>
          )}
          {selected.length > 0 && <Badge variant="secondary" className="mt-2 text-xs">{selected.length} selected</Badge>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || selected.length === 0}>
            {saving ? "Assigning..." : `Assign to ${selected.length || ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignProjectDialog;
