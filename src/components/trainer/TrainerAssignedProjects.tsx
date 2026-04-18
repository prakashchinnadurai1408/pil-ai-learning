import { useMemo, useState } from "react";
import { useProjectAssignments } from "@/hooks/useProjectAssignments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FolderKanban, Calendar, User, Search, Trash2, Loader2 } from "lucide-react";

interface Props { trainerId: string }

const STATUSES = ["assigned", "in_progress", "submitted", "reviewed"] as const;

const statusColor = (s: string) => {
  switch (s) {
    case "assigned": return "secondary";
    case "in_progress": return "default";
    case "submitted": return "outline";
    case "reviewed": return "default";
    default: return "secondary";
  }
};

const TrainerAssignedProjects = ({ trainerId }: Props) => {
  const { assignments, loading, refetch } = useProjectAssignments({ assignerId: trainerId, assignerRole: "trainer" });
  const [search, setSearch] = useState("");
  const [candidate, setCandidate] = useState("all");
  const [status, setStatus] = useState("all");

  const candidateOptions = useMemo(
    () => Array.from(new Set(assignments.map((a) => a.student_name))).sort(),
    [assignments]
  );

  const filtered = useMemo(() => assignments.filter((a) => {
    if (candidate !== "all" && a.student_name !== candidate) return false;
    if (status !== "all" && a.status !== status) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!a.title.toLowerCase().includes(q) && !a.student_name.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [assignments, candidate, status, search]);

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await (supabase as any).from("project_assignments").update({ status: newStatus }).eq("id", id);
    if (error) return toast.error("Failed to update status");
    toast.success("Status updated");
    refetch();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this project assignment?")) return;
    const { error } = await (supabase as any).from("project_assignments").delete().eq("id", id);
    if (error) return toast.error("Failed to delete");
    toast.success("Assignment deleted");
    refetch();
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FolderKanban className="h-4 w-4 text-primary" /> Projects You've Assigned
          <Badge variant="secondary" className="ml-auto">{assignments.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search title or candidate..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-xs" />
          </div>
          <Select value={candidate} onValueChange={setCandidate}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Candidate" /></SelectTrigger>
            <SelectContent className="bg-popover z-50 max-h-72">
              <SelectItem value="all">All candidates</SelectItem>
              {candidateOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-8">
            {assignments.length === 0 ? "You haven't assigned any projects yet." : "No projects match your filters."}
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((a) => (
              <div key={a.id} className="border border-border rounded-lg p-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h4 className="font-medium text-sm text-card-foreground">{a.title}</h4>
                      <Badge variant="secondary" className="text-[10px] capitalize">{a.source_type}</Badge>
                    </div>
                    {a.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{a.description}</p>}
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                      <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {a.student_name}</span>
                      {a.due_date && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Due {new Date(a.due_date).toLocaleDateString()}
                        </span>
                      )}
                      <span>Assigned {new Date(a.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={a.status} onValueChange={(v) => updateStatus(a.id, v)}>
                      <SelectTrigger className="h-7 text-[11px] w-[120px] capitalize"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-popover z-50">
                        {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize text-xs">{s.replace("_", " ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(a.id)} title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrainerAssignedProjects;
