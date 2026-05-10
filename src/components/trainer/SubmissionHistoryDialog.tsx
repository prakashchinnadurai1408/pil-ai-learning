import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, History as HistoryIcon, User, MessageSquare, AlertTriangle, Download, ExternalLink, StickyNote, Copy, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type AnySubmission = { id: string; student_name?: string } | null;

type HistoryRow = {
  id: string;
  submission_id: string;
  kind: string;
  version_number: number | null;
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

function downloadText(name: string, body: string) {
  const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function SubmissionHistoryDialog({ submission, onClose }: { submission: AnySubmission; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!submission) return;
    setLoading(true);
    supabase
      .from("curriculum_submission_history")
      .select("*")
      .eq("submission_id", submission.id)
      .order("version_number", { ascending: false })
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRows((data as HistoryRow[]) || []);
        setLoading(false);
      });
  }, [submission]);

  if (!submission) return null;

  // Compute display version per row when version_number is missing — fall back to chronological index.
  const total = rows.length;
  const studentRows = rows.filter((r) => r.kind === "student_submission");
  const studentOrder = new Map<string, number>();
  // Oldest student row = v1
  [...studentRows].reverse().forEach((r, i) => studentOrder.set(r.id, i + 1));

  return (
    <Dialog open={!!submission} onOpenChange={(b) => !b && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HistoryIcon className="h-4 w-4 text-primary" />
            Resubmission history{submission.student_name ? ` — ${submission.student_name}` : ""}
            {total > 0 && <Badge variant="outline" className="ml-2">{total} entr{total === 1 ? "y" : "ies"}</Badge>}
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
              const v = r.version_number ?? (isStudent ? studentOrder.get(r.id) ?? null : null);
              const stamp = new Date(r.created_at);
              const baseName = `submission-v${v ?? "x"}-${stamp.toISOString().slice(0, 10)}`;
              return (
                <div key={r.id} className="rounded border p-3 bg-muted/20 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      {v != null && (
                        <Badge className="bg-primary text-primary-foreground">v{v}</Badge>
                      )}
                      <Badge variant="outline" className={isStudent ? "bg-primary/10 text-primary border-primary/30" : "bg-warning/10 text-warning border-warning/30"}>
                        {isStudent ? <User className="h-3 w-3 mr-1" /> : <MessageSquare className="h-3 w-3 mr-1" />}
                        {isStudent ? "Student version" : "Trainer review"}
                      </Badge>
                      {r.status && <Badge variant="outline">{r.status}</Badge>}
                      {r.actor_name && <span className="text-muted-foreground">by {r.actor_name}</span>}
                    </div>
                    <span className="text-muted-foreground">{stamp.toLocaleString()}</span>
                  </div>

                  {/* Attachment snapshot — separate downloadable item */}
                  {r.attachment_url && (
                    <div className="rounded border bg-background p-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs min-w-0">
                        <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="truncate" title={r.attachment_name || "attachment"}>{r.attachment_name || "attachment"}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button asChild size="sm" variant="ghost" className="h-7 px-2">
                          <a href={r.attachment_url} target="_blank" rel="noreferrer" aria-label="Open attachment in new tab">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                        <Button asChild size="sm" variant="outline" className="h-7 px-2 text-xs">
                          <a href={r.attachment_url} download={r.attachment_name || `${baseName}-attachment`}>
                            <Download className="h-3.5 w-3.5 mr-1" /> Download
                          </a>
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Notes snapshot — separate downloadable item */}
                  {r.notes && (
                    <div className="rounded border bg-background p-2">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                          <StickyNote className="h-3 w-3" /> Student notes
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={async () => {
                              await navigator.clipboard.writeText(r.notes);
                              setCopiedId(r.id);
                              toast({ title: "Notes copied" });
                              setTimeout(() => setCopiedId((c) => (c === r.id ? null : c)), 1500);
                            }}
                          >
                            {copiedId === r.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            onClick={() => downloadText(`${baseName}-notes.txt`, r.notes)}
                          >
                            <Download className="h-3.5 w-3.5 mr-1" /> Download
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs whitespace-pre-wrap">{r.notes}</p>
                    </div>
                  )}

                  {r.trainer_feedback && (
                    <div className="rounded border-l-2 border-primary bg-primary/5 p-2">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="text-[11px] uppercase tracking-wide text-primary">Trainer feedback</div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={() => downloadText(`${baseName}-feedback.txt`, r.trainer_feedback)}
                        >
                          <Download className="h-3.5 w-3.5 mr-1" /> Download
                        </Button>
                      </div>
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
