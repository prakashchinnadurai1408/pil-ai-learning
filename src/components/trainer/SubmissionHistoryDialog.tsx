import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, History as HistoryIcon, User, MessageSquare, AlertTriangle } from "lucide-react";

type AnySubmission = { id: string; student_name?: string } | null;

type HistoryRow = {
  id: string;
  submission_id: string;
  kind: string;
  attachment_url: string;
  attachment_name: string;
  notes: string;
  trainer_feedback: string;
  revision_message: string;
  revision_due_date: string | null;
  score: number | null;
  max_score: number | null;
  status: string;
  actor_id: string;
  actor_name: string;
  actor_role: string;
  created_at: string;
};

export default function SubmissionHistoryDialog({ submission, onClose }: { submission: AnySubmission; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<HistoryRow[]>([]);

  useEffect(() => {
    if (!submission) return;
    setLoading(true);
    supabase
      .from("curriculum_submission_history")
      .select("*")
      .eq("submission_id", submission.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRows((data as HistoryRow[]) || []);
        setLoading(false);
      });
  }, [submission]);

  if (!submission) return null;

  return (
    <Dialog open={!!submission} onOpenChange={(b) => !b && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HistoryIcon className="h-4 w-4 text-primary" />
            Resubmission history{submission.student_name ? ` — ${submission.student_name}` : ""}
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="py-10 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No prior versions yet. History is recorded each time a student resubmits or a trainer reviews.</div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => {
              const isStudent = r.kind === "student_submission";
              return (
                <div key={r.id} className="rounded border p-3 bg-muted/20 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={isStudent ? "bg-primary/10 text-primary border-primary/30" : "bg-warning/10 text-warning border-warning/30"}>
                        {isStudent ? <User className="h-3 w-3 mr-1" /> : <MessageSquare className="h-3 w-3 mr-1" />}
                        {isStudent ? "Student version" : "Trainer review"}
                      </Badge>
                      {r.status && <Badge variant="outline">{r.status}</Badge>}
                      {r.actor_name && <span className="text-muted-foreground">by {r.actor_name}</span>}
                    </div>
                    <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                  {r.notes && (
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Student notes</div>
                      <p className="text-xs whitespace-pre-wrap">{r.notes}</p>
                    </div>
                  )}
                  {r.attachment_url && (
                    <a href={r.attachment_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <FileText className="h-3 w-3" /> {r.attachment_name || "attachment"}
                    </a>
                  )}
                  {r.trainer_feedback && (
                    <div className="rounded border-l-2 border-primary bg-primary/5 p-2">
                      <div className="text-[11px] uppercase tracking-wide text-primary">Trainer feedback</div>
                      <p className="text-xs whitespace-pre-wrap">{r.trainer_feedback}</p>
                    </div>
                  )}
                  {r.revision_message && (
                    <div className="rounded border-l-2 border-warning bg-warning/5 p-2">
                      <div className="text-[11px] uppercase tracking-wide text-warning flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Revision requested</div>
                      <p className="text-xs whitespace-pre-wrap">{r.revision_message}</p>
                      {r.revision_due_date && <p className="text-[11px] text-muted-foreground mt-1">Due {new Date(r.revision_due_date).toLocaleDateString()}</p>}
                    </div>
                  )}
                  {r.score != null && (
                    <div className="text-xs text-primary font-medium">Score: {r.score}{r.max_score != null ? ` / ${r.max_score}` : ""}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
