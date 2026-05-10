import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, FileText, History as HistoryIcon, User, MessageSquare, AlertTriangle, Download, ExternalLink, StickyNote, Copy, Check, GitCompare, Paperclip, Plus, Minus, ChevronUp, ChevronDown, FileDown } from "lucide-react";
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

// Aligned line-level LCS diff. Returns a single list of paired rows so the two
// columns line up visually (gaps appear as blank rows on the opposite side).
type DiffSide = { type: "same" | "add" | "del" | "empty"; text: string };
type DiffRow = { left: DiffSide; right: DiffSide };

function diffAligned(a: string, b: string): DiffRow[] {
  const A = (a || "").split(/\r?\n/);
  const B = (b || "").split(/\r?\n/);
  const m = A.length, n = B.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const rows: DiffRow[] = [];
  let i = 0, j = 0;
  while (i < m && j < n) {
    if (A[i] === B[j]) {
      rows.push({ left: { type: "same", text: A[i] }, right: { type: "same", text: B[j] } });
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rows.push({ left: { type: "del", text: A[i] }, right: { type: "empty", text: "" } });
      i++;
    } else {
      rows.push({ left: { type: "empty", text: "" }, right: { type: "add", text: B[j] } });
      j++;
    }
  }
  while (i < m) { rows.push({ left: { type: "del", text: A[i++] }, right: { type: "empty", text: "" } }); }
  while (j < n) { rows.push({ left: { type: "empty", text: "" }, right: { type: "add", text: B[j++] } }); }
  return rows;
}

function filterChangedRows(rows: DiffRow[], context = 1): DiffRow[] {
  const keep = new Array(rows.length).fill(false);
  rows.forEach((r, idx) => {
    if (r.left.type !== "same" || r.right.type !== "same") {
      for (let k = Math.max(0, idx - context); k <= Math.min(rows.length - 1, idx + context); k++) keep[k] = true;
    }
  });
  return rows.filter((_, idx) => keep[idx]);
}

function cellClass(t: DiffSide["type"]) {
  if (t === "add") return "bg-success/15 text-success-foreground";
  if (t === "del") return "bg-destructive/15 text-destructive";
  if (t === "empty") return "bg-muted/30";
  return "";
}
function marker(t: DiffSide["type"]) {
  if (t === "add") return "+";
  if (t === "del") return "-";
  return " ";
}

function countChanges(rows: DiffRow[]): { added: number; removed: number } {
  let added = 0, removed = 0;
  rows.forEach((r) => {
    if (r.left.type === "del") removed++;
    if (r.right.type === "add") added++;
  });
  return { added, removed };
}

function AlignedDiff({ rows, leftLabel, rightLabel, section }: { rows: DiffRow[]; leftLabel: string; rightLabel: string; section: string }) {
  const isEmpty = rows.length === 0 || rows.every((r) => !r.left.text && !r.right.text);
  return (
    <div className="rounded border bg-background overflow-hidden" data-diff-section={section}>
      <div className="grid grid-cols-2 text-[11px] uppercase tracking-wide text-muted-foreground border-b bg-muted/30">
        <div className="px-2 py-1 border-r truncate" title={leftLabel}>{leftLabel}</div>
        <div className="px-2 py-1 truncate" title={rightLabel}>{rightLabel}</div>
      </div>
      <div className="font-mono text-[11px] leading-relaxed max-h-72 overflow-auto">
        {isEmpty ? (
          <div className="px-2 py-3 text-muted-foreground italic">— no differences —</div>
        ) : rows.map((r, idx) => {
          const isChange = r.left.type !== "same" || r.right.type !== "same";
          return (
            <div key={idx} className="grid grid-cols-2" data-diff-change={isChange ? "true" : undefined}>
              <div className={`px-2 border-r ${cellClass(r.left.type)}`}>
                <span className="select-none mr-1 text-muted-foreground">{marker(r.left.type)}</span>
                {r.left.text || "\u00A0"}
              </div>
              <div className={`px-2 ${cellClass(r.right.type)}`}>
                <span className="select-none mr-1 text-muted-foreground">{marker(r.right.type)}</span>
                {r.right.text || "\u00A0"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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

const LS_KEY = (id: string) => `submission-history:${id}`;

export default function SubmissionHistoryDialog({ submission, onClose }: { submission: AnySubmission; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [tab, setTab] = useState<"timeline" | "compare">("timeline");
  const [leftId, setLeftId] = useState<string>("");
  const [rightId, setRightId] = useState<string>("");
  const [onlyChanges, setOnlyChanges] = useState(false);
  const compareRef = useRef<HTMLDivElement | null>(null);
  const changeIdxRef = useRef<number>(-1);

  // Restore persisted selections (URL > localStorage) when dialog opens.
  useEffect(() => {
    if (!submission) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get("histTab");
      const urlLeft = params.get("histLeft");
      const urlRight = params.get("histRight");
      const urlOnly = params.get("histOnly");
      const stored = JSON.parse(localStorage.getItem(LS_KEY(submission.id)) || "null") as
        | { tab?: string; leftId?: string; rightId?: string; onlyChanges?: boolean }
        | null;
      const t = (urlTab || stored?.tab) as "timeline" | "compare" | undefined;
      if (t === "timeline" || t === "compare") setTab(t);
      if (urlLeft || stored?.leftId) setLeftId(urlLeft || stored!.leftId!);
      if (urlRight || stored?.rightId) setRightId(urlRight || stored!.rightId!);
      const only = urlOnly != null ? urlOnly === "1" : stored?.onlyChanges;
      if (typeof only === "boolean") setOnlyChanges(only);
    } catch { /* ignore */ }
  }, [submission]);

  // Default-pick newest two rows for compare once loaded (only if nothing restored).
  useEffect(() => {
    if (rows.length >= 2) {
      setLeftId((cur) => cur && rows.some((r) => r.id === cur) ? cur : rows[1].id);
      setRightId((cur) => cur && rows.some((r) => r.id === cur) ? cur : rows[0].id);
    } else if (rows.length === 1) {
      setLeftId(rows[0].id);
      setRightId(rows[0].id);
    }
  }, [rows]);

  // Persist selections to URL + localStorage whenever they change.
  useEffect(() => {
    if (!submission) return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("histTab", tab);
      if (leftId) url.searchParams.set("histLeft", leftId); else url.searchParams.delete("histLeft");
      if (rightId) url.searchParams.set("histRight", rightId); else url.searchParams.delete("histRight");
      url.searchParams.set("histOnly", onlyChanges ? "1" : "0");
      window.history.replaceState({}, "", url.toString());
      localStorage.setItem(LS_KEY(submission.id), JSON.stringify({ tab, leftId, rightId, onlyChanges }));
    } catch { /* ignore */ }
  }, [submission, tab, leftId, rightId, onlyChanges]);

  // Clean URL params when closing.
  const handleClose = () => {
    try {
      const url = new URL(window.location.href);
      ["histTab", "histLeft", "histRight", "histOnly"].forEach((k) => url.searchParams.delete(k));
      window.history.replaceState({}, "", url.toString());
    } catch { /* ignore */ }
    onClose();
  };

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

  const total = rows.length;
  const studentRows = rows.filter((r) => r.kind === "student_submission");
  const studentOrder = new Map<string, number>();
  [...studentRows].reverse().forEach((r, i) => studentOrder.set(r.id, i + 1));

  const labelFor = (r: HistoryRow) => {
    const v = r.version_number ?? (r.kind === "student_submission" ? studentOrder.get(r.id) ?? null : null);
    const kind = r.kind === "student_submission" ? "Student" : "Trainer";
    const stamp = new Date(r.created_at).toLocaleString();
    return `${v != null ? `v${v} · ` : ""}${kind} · ${stamp}`;
  };
  const left = useMemo(() => rows.find((r) => r.id === leftId) || null, [rows, leftId]);
  const right = useMemo(() => rows.find((r) => r.id === rightId) || null, [rows, rightId]);

  const notesRowsAll = useMemo(() => diffAligned(left?.notes || "", right?.notes || ""), [left, right]);
  const fbRowsAll = useMemo(() => diffAligned(left?.trainer_feedback || "", right?.trainer_feedback || ""), [left, right]);
  const notesRows = useMemo(() => (onlyChanges ? filterChangedRows(notesRowsAll) : notesRowsAll), [notesRowsAll, onlyChanges]);
  const fbRows = useMemo(() => (onlyChanges ? filterChangedRows(fbRowsAll) : fbRowsAll), [fbRowsAll, onlyChanges]);

  // Attachment diff: compare by name + url across the two versions.
  type Att = { name: string; url: string };
  const leftAtt: Att | null = left?.attachment_url ? { name: left.attachment_name || "attachment", url: left.attachment_url } : null;
  const rightAtt: Att | null = right?.attachment_url ? { name: right.attachment_name || "attachment", url: right.attachment_url } : null;
  const sameAtt = !!leftAtt && !!rightAtt && leftAtt.url === rightAtt.url && leftAtt.name === rightAtt.name;
  const removedAtt = leftAtt && (!rightAtt || !sameAtt) ? leftAtt : null;
  const addedAtt = rightAtt && (!leftAtt || !sameAtt) ? rightAtt : null;

  return (
    <Dialog open={!!submission} onOpenChange={(b) => !b && handleClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
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
          <Tabs value={tab} onValueChange={(v) => setTab(v as "timeline" | "compare")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="timeline"><HistoryIcon className="h-3.5 w-3.5 mr-1" /> Timeline</TabsTrigger>
              <TabsTrigger value="compare" disabled={rows.length < 2}><GitCompare className="h-3.5 w-3.5 mr-1" /> Compare</TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="space-y-3 mt-3">
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
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{stamp.toLocaleString()}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => { setLeftId(r.id); setTab("compare"); }}
                          disabled={rows.length < 2}
                          title="Use this version as the left side of compare"
                        >
                          <GitCompare className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

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
            </TabsContent>

            <TabsContent value="compare" className="space-y-4 mt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Left (older)</div>
                  <Select value={leftId} onValueChange={setLeftId}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pick a version" /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {rows.map((r) => (
                        <SelectItem key={r.id} value={r.id} className="text-xs">{labelFor(r)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Right (newer)</div>
                  <Select value={rightId} onValueChange={setRightId}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Pick a version" /></SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      {rows.map((r) => (
                        <SelectItem key={r.id} value={r.id} className="text-xs">{labelFor(r)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(() => {
                const notesC = countChanges(notesRowsAll);
                const fbC = countChanges(fbRowsAll);
                const attAdded = addedAtt ? 1 : 0;
                const attRemoved = removedAtt ? 1 : 0;
                const totalChanged = notesC.added + notesC.removed + fbC.added + fbC.removed;
                const goToChange = (dir: 1 | -1) => {
                  const root = compareRef.current;
                  if (!root) return;
                  const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-diff-change="true"]'));
                  if (nodes.length === 0) return;
                  let next = (changeIdxRef.current + dir);
                  if (next < 0) next = nodes.length - 1;
                  if (next >= nodes.length) next = 0;
                  changeIdxRef.current = next;
                  nodes[next].scrollIntoView({ block: "center", behavior: "smooth" });
                  nodes.forEach((n) => n.classList.remove("ring-2", "ring-primary"));
                  nodes[next].classList.add("ring-2", "ring-primary");
                };
                return (
                  <div className="rounded border bg-muted/20 p-2 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap text-[11px]">
                        <Badge variant="outline" className="text-[10px]">{totalChanged} changed line{totalChanged === 1 ? "" : "s"}</Badge>
                        <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/30">+{notesC.added + fbC.added} added</Badge>
                        <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30">-{notesC.removed + fbC.removed} removed</Badge>
                        <span className="text-muted-foreground">·</span>
                        <Badge variant="outline" className="text-[10px]"><Paperclip className="h-2.5 w-2.5 mr-1" />+{attAdded} / -{attRemoved} attachment{(attAdded + attRemoved) === 1 ? "" : "s"}</Badge>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Switch id="only-changes" checked={onlyChanges} onCheckedChange={setOnlyChanges} />
                          <Label htmlFor="only-changes" className="text-xs cursor-pointer">Show only changes</Label>
                        </div>
                        {onlyChanges && (
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => goToChange(-1)} title="Previous change" disabled={totalChanged === 0}>
                              <ChevronUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => goToChange(1)} title="Next change" disabled={totalChanged === 0}>
                              <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={() => exportComparisonHtml({
                            studentName: submission.student_name,
                            left, right, labelFor,
                            notesRows: notesRowsAll, fbRows: fbRowsAll,
                            leftAtt, rightAtt, sameAtt, addedAtt, removedAtt,
                            summary: { totalChanged, addedLines: notesC.added + fbC.added, removedLines: notesC.removed + fbC.removed, attAdded, attRemoved },
                          })}
                          disabled={!left || !right}
                        >
                          <FileDown className="h-3.5 w-3.5 mr-1" /> Export comparison
                        </Button>
                      </div>
                    </div>
                    {leftId && rightId && leftId === rightId && (
                      <div className="text-xs text-muted-foreground italic">Pick two different versions to see a diff.</div>
                    )}
                  </div>
                );
              })()}

              <div ref={compareRef} className="space-y-4">
                {/* Attachments diff */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold flex items-center gap-1"><Paperclip className="h-3.5 w-3.5" /> Attachments</div>
                  {!leftAtt && !rightAtt ? (
                    <div className="text-[11px] text-muted-foreground italic px-1">No attachments on either version.</div>
                  ) : sameAtt ? (
                    <div className="rounded border bg-muted/20 p-2 text-xs flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 min-w-0"><FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><span className="truncate">{leftAtt!.name}</span></span>
                      <Badge variant="outline" className="text-[10px]">unchanged</Badge>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="rounded border bg-background overflow-hidden">
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground px-2 py-1 border-b bg-muted/30">Removed (left)</div>
                        <div className="p-2" data-diff-change={removedAtt ? "true" : undefined}>
                          {removedAtt ? (
                            <div className="flex items-center justify-between gap-2 text-xs bg-destructive/10 rounded p-2">
                              <span className="flex items-center gap-1.5 min-w-0"><Minus className="h-3 w-3 text-destructive shrink-0" /><span className="truncate" title={removedAtt.name}>{removedAtt.name}</span></span>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button asChild size="sm" variant="ghost" className="h-6 px-1.5"><a href={removedAtt.url} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" /></a></Button>
                                <Button asChild size="sm" variant="outline" className="h-6 px-1.5 text-[11px]"><a href={removedAtt.url} download={removedAtt.name}><Download className="h-3 w-3" /></a></Button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-[11px] text-muted-foreground italic">— none —</div>
                          )}
                        </div>
                      </div>
                      <div className="rounded border bg-background overflow-hidden">
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground px-2 py-1 border-b bg-muted/30">Added (right)</div>
                        <div className="p-2" data-diff-change={addedAtt ? "true" : undefined}>
                          {addedAtt ? (
                            <div className="flex items-center justify-between gap-2 text-xs bg-success/10 rounded p-2">
                              <span className="flex items-center gap-1.5 min-w-0"><Plus className="h-3 w-3 text-success shrink-0" /><span className="truncate" title={addedAtt.name}>{addedAtt.name}</span></span>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button asChild size="sm" variant="ghost" className="h-6 px-1.5"><a href={addedAtt.url} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" /></a></Button>
                                <Button asChild size="sm" variant="outline" className="h-6 px-1.5 text-[11px]"><a href={addedAtt.url} download={addedAtt.name}><Download className="h-3 w-3" /></a></Button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-[11px] text-muted-foreground italic">— none —</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold flex items-center gap-1"><StickyNote className="h-3.5 w-3.5" /> Student notes</div>
                  <AlignedDiff section="notes" rows={notesRows} leftLabel={left ? labelFor(left) : "Left"} rightLabel={right ? labelFor(right) : "Right"} />
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> Trainer feedback</div>
                  <AlignedDiff section="feedback" rows={fbRows} leftLabel={left ? labelFor(left) : "Left"} rightLabel={right ? labelFor(right) : "Right"} />
                </div>

                <div className="text-[11px] text-muted-foreground flex items-center gap-3">
                  <span><span className="inline-block w-2 h-2 rounded-sm bg-destructive/30 mr-1 align-middle" /> removed (only on left)</span>
                  <span><span className="inline-block w-2 h-2 rounded-sm bg-success/30 mr-1 align-middle" /> added (only on right)</span>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
