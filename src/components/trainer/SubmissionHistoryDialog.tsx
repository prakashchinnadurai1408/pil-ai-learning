import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, FileText, History as HistoryIcon, User, MessageSquare, AlertTriangle, Download, ExternalLink, StickyNote, Copy, Check, GitCompare, Paperclip, Plus, Minus, ChevronUp, ChevronDown, FileDown, Search, X as XIcon, ChevronRight } from "lucide-react";
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

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function Highlight({ text, query }: { text: string; query: string }) {
  const t = text || "";
  const q = (query || "").trim();
  if (!q) return <>{t || "\u00A0"}</>;
  try {
    const re = new RegExp(`(${escapeRegex(q)})`, "ig");
    const parts = t.split(re);
    return (
      <>
        {parts.map((p, i) =>
          i % 2 === 1 ? (
            <mark key={i} data-hl="true" className="bg-warning/40 text-foreground rounded-sm px-0.5">{p}</mark>
          ) : (
            <span key={i}>{p}</span>
          )
        )}
        {t === "" && "\u00A0"}
      </>
    );
  } catch {
    return <>{t || "\u00A0"}</>;
  }
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

function AlignedDiff({ rows, leftLabel, rightLabel, section, query }: { rows: DiffRow[]; leftLabel: string; rightLabel: string; section: string; query?: string }) {
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
                <Highlight text={r.left.text} query={query || ""} />
              </div>
              <div className={`px-2 ${cellClass(r.right.type)}`}>
                <span className="select-none mr-1 text-muted-foreground">{marker(r.right.type)}</span>
                <Highlight text={r.right.text} query={query || ""} />
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

function escapeHtml(s: string): string {
  return (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function renderDiffTableHtml(rows: DiffRow[]): string {
  if (rows.length === 0) return '<p class="empty">— no differences —</p>';
  const rowsHtml = rows.map((r) => {
    const lc = r.left.type === "del" ? "del" : r.left.type === "empty" ? "empty" : "same";
    const rc = r.right.type === "add" ? "add" : r.right.type === "empty" ? "empty" : "same";
    const lm = r.left.type === "del" ? "-" : " ";
    const rm = r.right.type === "add" ? "+" : " ";
    return `<tr><td class="${lc}"><span class="m">${lm}</span>${escapeHtml(r.left.text) || "&nbsp;"}</td><td class="${rc}"><span class="m">${rm}</span>${escapeHtml(r.right.text) || "&nbsp;"}</td></tr>`;
  }).join("");
  return `<table class="diff"><tbody>${rowsHtml}</tbody></table>`;
}

function exportComparisonHtml(args: {
  studentName?: string;
  left: HistoryRow | null;
  right: HistoryRow | null;
  labelFor: (r: HistoryRow) => string;
  notesRows: DiffRow[];
  fbRows: DiffRow[];
  leftAtt: { name: string; url: string } | null;
  rightAtt: { name: string; url: string } | null;
  sameAtt: boolean;
  addedAtt: { name: string; url: string } | null;
  removedAtt: { name: string; url: string } | null;
  summary: { totalChanged: number; addedLines: number; removedLines: number; attAdded: number; attRemoved: number };
}) {
  const { studentName, left, right, labelFor, notesRows, fbRows, leftAtt, rightAtt, sameAtt, addedAtt, removedAtt, summary } = args;
  const leftLabel = left ? labelFor(left) : "Left";
  const rightLabel = right ? labelFor(right) : "Right";
  const attHtml = !leftAtt && !rightAtt
    ? '<p class="empty">No attachments on either version.</p>'
    : sameAtt
      ? `<p>Attachment unchanged: <strong>${escapeHtml(leftAtt!.name)}</strong> — <a href="${escapeHtml(leftAtt!.url)}">open</a></p>`
      : `<table class="att"><thead><tr><th>Removed (left)</th><th>Added (right)</th></tr></thead><tbody><tr><td class="del">${
          removedAtt ? `<span class="m">-</span><strong>${escapeHtml(removedAtt.name)}</strong> — <a href="${escapeHtml(removedAtt.url)}">open</a>` : "<em>— none —</em>"
        }</td><td class="add">${
          addedAtt ? `<span class="m">+</span><strong>${escapeHtml(addedAtt.name)}</strong> — <a href="${escapeHtml(addedAtt.url)}">open</a>` : "<em>— none —</em>"
        }</td></tr></tbody></table>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Resubmission comparison${studentName ? ` — ${escapeHtml(studentName)}` : ""}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;margin:24px;color:#0f172a;background:#fff;}
  h1{font-size:18px;margin:0 0 4px;} h2{font-size:14px;margin:24px 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px;}
  .meta{font-size:12px;color:#64748b;margin-bottom:12px;}
  .summary{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 16px;font-size:11px;}
  .badge{border:1px solid #cbd5e1;border-radius:4px;padding:2px 6px;background:#f8fafc;}
  .badge.add{background:#dcfce7;border-color:#86efac;color:#166534;}
  .badge.del{background:#fee2e2;border-color:#fca5a5;color:#991b1b;}
  table.diff,table.att{width:100%;border-collapse:collapse;table-layout:fixed;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;}
  table.diff td,table.att td,table.att th{border:1px solid #e2e8f0;padding:2px 6px;vertical-align:top;word-wrap:break-word;white-space:pre-wrap;}
  table.att th{background:#f1f5f9;font-size:11px;text-align:left;font-family:inherit;}
  td.add{background:#dcfce7;color:#166534;} td.del{background:#fee2e2;color:#991b1b;} td.empty{background:#f8fafc;}
  .m{display:inline-block;width:1em;color:#94a3b8;user-select:none;}
  .header-row{display:grid;grid-template-columns:1fr 1fr;font-size:11px;text-transform:uppercase;color:#64748b;margin-bottom:4px;}
  .header-row div{padding:2px 6px;background:#f1f5f9;border:1px solid #e2e8f0;}
  .empty{color:#94a3b8;font-style:italic;}
  @media print{body{margin:12px;} a{color:inherit;text-decoration:none;}}
</style></head><body>
  <h1>Resubmission comparison${studentName ? ` — ${escapeHtml(studentName)}` : ""}</h1>
  <div class="meta">Generated ${new Date().toLocaleString()}</div>
  <div class="summary">
    <span class="badge">${summary.totalChanged} changed line${summary.totalChanged === 1 ? "" : "s"}</span>
    <span class="badge add">+${summary.addedLines} added</span>
    <span class="badge del">-${summary.removedLines} removed</span>
    <span class="badge">+${summary.attAdded} / -${summary.attRemoved} attachment${(summary.attAdded + summary.attRemoved) === 1 ? "" : "s"}</span>
  </div>
  <div class="header-row"><div>${escapeHtml(leftLabel)}</div><div>${escapeHtml(rightLabel)}</div></div>

  <h2>Attachments</h2>
  ${attHtml}

  <h2>Student notes</h2>
  ${renderDiffTableHtml(notesRows)}

  <h2>Trainer feedback</h2>
  ${renderDiffTableHtml(fbRows)}

  <script>setTimeout(()=>{try{window.print&&window.print()}catch(e){}}, 300);</script>
</body></html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `comparison-${stamp}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Also open in a new tab so the user can print → PDF immediately.
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export default function SubmissionHistoryDialog({ submission, onClose }: { submission: AnySubmission; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [tab, setTab] = useState<"timeline" | "compare">("timeline");
  const [leftId, setLeftId] = useState<string>("");
  const [rightId, setRightId] = useState<string>("");
  const [onlyChanges, setOnlyChanges] = useState(false);
  const [onlyMatches, setOnlyMatches] = useState(false);
  const [query, setQuery] = useState("");
  const [attsOpen, setAttsOpen] = useState(true);
  const [changeIdx, setChangeIdx] = useState(0);
  const [changeTotal, setChangeTotal] = useState(0);
  const [matchIdx, setMatchIdx] = useState(0);
  const [matchTotal, setMatchTotal] = useState(0);
  const [linkCopied, setLinkCopied] = useState(false);
  // Subtle UI hint shown when a shared-link histM had to be clamped to a
  // smaller in-range value. Holds the originally-requested index until
  // dismissed or the user navigates manually.
  const [clampedFrom, setClampedFrom] = useState<number | null>(null);
  // True while we are still waiting for history rows / DOM matches to render
  // for a pending shared-link histM. Drives the "Jumping to shared match…"
  // inline indicator next to the match badge.
  const [restoringMatch, setRestoringMatch] = useState(false);
  const compareRef = useRef<HTMLDivElement | null>(null);
  const changeIdxRef = useRef<number>(-1);
  const matchIdxRef = useRef<number>(-1);
  // When set, the next match-render pass will scroll to (and clamp to) this
  // index. Used for restoring `histM` from a shared compare link.
  const pendingMatchRef = useRef<number | null>(null);

  // Restore persisted selections (URL > localStorage) when dialog opens.
  useEffect(() => {
    if (!submission) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get("histTab");
      const urlLeft = params.get("histLeft");
      const urlRight = params.get("histRight");
      const urlOnly = params.get("histOnly");
      const urlQ = params.get("histQ");
      const urlAtts = params.get("histAtts");
      const urlOnlyM = params.get("histOnlyM");
      const stored = JSON.parse(localStorage.getItem(LS_KEY(submission.id)) || "null") as
        | { tab?: string; leftId?: string; rightId?: string; onlyChanges?: boolean; query?: string; attsOpen?: boolean; onlyMatches?: boolean }
        | null;
      const t = (urlTab || stored?.tab) as "timeline" | "compare" | undefined;
      if (t === "timeline" || t === "compare") setTab(t);
      if (urlLeft || stored?.leftId) setLeftId(urlLeft || stored!.leftId!);
      if (urlRight || stored?.rightId) setRightId(urlRight || stored!.rightId!);
      const only = urlOnly != null ? urlOnly === "1" : stored?.onlyChanges;
      if (typeof only === "boolean") setOnlyChanges(only);
      const qv = urlQ != null ? urlQ : stored?.query;
      if (typeof qv === "string") setQuery(qv);
      const ao = urlAtts != null ? urlAtts === "1" : stored?.attsOpen;
      if (typeof ao === "boolean") setAttsOpen(ao);
      const om = urlOnlyM != null ? urlOnlyM === "1" : stored?.onlyMatches;
      if (typeof om === "boolean") setOnlyMatches(om);
      const mi = params.get("histM");
      if (mi != null) {
        const n = parseInt(mi, 10);
        if (Number.isFinite(n) && n >= 0) {
          // Defer the actual scroll/clamp until matches have rendered so the
          // index can be clamped against the real number of matches.
          pendingMatchRef.current = n;
          matchIdxRef.current = n;
          setMatchIdx(n);
          // Flip a brief loading state so the UI tells the user we're waiting
          // for rows / matches before scrolling.
          setRestoringMatch(true);
        }
      }
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
      if (query) url.searchParams.set("histQ", query); else url.searchParams.delete("histQ");
      url.searchParams.set("histAtts", attsOpen ? "1" : "0");
      url.searchParams.set("histOnlyM", onlyMatches ? "1" : "0");
      if (matchIdx > 0) url.searchParams.set("histM", String(matchIdx)); else url.searchParams.delete("histM");
      window.history.replaceState({}, "", url.toString());
      localStorage.setItem(LS_KEY(submission.id), JSON.stringify({ tab, leftId, rightId, onlyChanges, query, attsOpen, onlyMatches }));
    } catch { /* ignore */ }
  }, [submission, tab, leftId, rightId, onlyChanges, query, attsOpen, onlyMatches, matchIdx]);

  // Auto-scroll to the first visible changed block whenever the user toggles
  // "Show only changes" so relevant edits are immediately in view.
  useEffect(() => {
    if (tab !== "compare") return;
    const root = compareRef.current;
    if (!root) return;
    const t = setTimeout(() => {
      const first = root.querySelector<HTMLElement>('[data-diff-change="true"]');
      if (!first) return;
      first.scrollIntoView({ block: "start", behavior: "smooth" });
      first.classList.add("ring-2", "ring-primary");
      changeIdxRef.current = 0;
      setChangeIdx(0);
      setTimeout(() => first.classList.remove("ring-2", "ring-primary"), 1500);
    }, 80);
    return () => clearTimeout(t);
  }, [onlyChanges, tab, leftId, rightId, rows]);

  // Recount visible change blocks whenever the filtered diff changes so the
  // prev/next counter stays accurate as the user types or toggles filters.
  useEffect(() => {
    if (tab !== "compare") return;
    const root = compareRef.current;
    if (!root) { setChangeTotal(0); setChangeIdx(0); return; }
    const t = setTimeout(() => {
      const nodes = root.querySelectorAll<HTMLElement>('[data-diff-change="true"]');
      setChangeTotal(nodes.length);
      if (changeIdxRef.current >= nodes.length) {
        changeIdxRef.current = nodes.length > 0 ? 0 : -1;
        setChangeIdx(0);
      }
    }, 70);
    return () => clearTimeout(t);
  }, [tab, query, onlyChanges, onlyMatches, leftId, rightId, rows, attsOpen]);

  // Recount keyword matches (rendered <mark> elements) so the match navigator
  // pager stays accurate as the user types or toggles "Only matches".
  useEffect(() => {
    if (tab !== "compare") { setMatchTotal(0); setMatchIdx(0); matchIdxRef.current = -1; return; }
    const root = compareRef.current;
    if (!root) { setMatchTotal(0); setMatchIdx(0); matchIdxRef.current = -1; return; }
    const t = setTimeout(() => {
      const nodes = root.querySelectorAll<HTMLElement>('mark[data-hl="true"]');
      setMatchTotal(nodes.length);
      // Clamp the active match index to the nearest valid match. A shared link
      // may carry a histM that exceeds the current total (e.g. after the
      // diff/filters changed) — clamp to the last available rather than 0 so
      // the user lands on a real, in-range highlight.
      if (nodes.length === 0) {
        matchIdxRef.current = -1;
        setMatchIdx(0);
      } else if (matchIdxRef.current < 0) {
        matchIdxRef.current = 0;
        setMatchIdx(0);
      } else if (matchIdxRef.current >= nodes.length) {
        // Capture the originally-requested index so we can surface a subtle
        // "Adjusted to nearest match" hint to the user.
        setClampedFrom(matchIdxRef.current);
        matchIdxRef.current = nodes.length - 1;
        setMatchIdx(nodes.length - 1);
      }
    }, 80);
    return () => clearTimeout(t);
  }, [tab, query, onlyChanges, onlyMatches, leftId, rightId, rows, attsOpen]);

  // Auto-scroll to a highlighted match. Honors a pending histM index from a
  // shared link (clamped to the last valid match); otherwise jumps to the
  // first match. Debounced so typing in the search box doesn't fight the
  // cursor — the jump only fires after a brief pause.
  useEffect(() => {
    if (tab !== "compare") return;
    if (!query) {
      pendingMatchRef.current = null;
      return;
    }
    const root = compareRef.current;
    if (!root) return;
    const t = setTimeout(() => {
      const nodes = root.querySelectorAll<HTMLElement>('mark[data-hl="true"]');
      if (nodes.length === 0) return;
      let idx: number;
      if (pendingMatchRef.current != null) {
        idx = Math.min(Math.max(0, pendingMatchRef.current), nodes.length - 1);
        pendingMatchRef.current = null;
      } else {
        idx = 0;
      }
      matchIdxRef.current = idx;
      setMatchIdx(idx);
      setMatchTotal(nodes.length);
      const target = nodes[idx];
      target.scrollIntoView({ block: "center", behavior: "smooth" });
      target.classList.add("ring-2", "ring-primary");
      setTimeout(() => target.classList.remove("ring-2", "ring-primary"), 1500);
    }, 500);
    return () => clearTimeout(t);
  }, [query, onlyMatches, tab, leftId, rightId, rows]);

  // Keyboard shortcuts inside the dialog: N = next change, P = previous change,
  // Esc = clear search (only when search has a value; otherwise let the dialog close).
  useEffect(() => {
    if (!submission || tab !== "compare") return;
    const isTypingTarget = (el: EventTarget | null) => {
      const node = el as HTMLElement | null;
      if (!node) return false;
      const tag = node.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || node.isContentEditable;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && query) {
        // Only intercept Esc when there's a query to clear; allow dialog close otherwise.
        e.stopPropagation();
        e.preventDefault();
        setQuery("");
        return;
      }
      if (isTypingTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const root = compareRef.current;
      if (!root) return;

      // Shift+N / Shift+P navigate keyword matches; plain N/P navigate change blocks.
      if (e.shiftKey && (e.key === "N" || e.key === "P" || e.key === "n" || e.key === "p")) {
        const matchNodes = Array.from(root.querySelectorAll<HTMLElement>('mark[data-hl="true"]'));
        if (matchNodes.length === 0) return;
        const dir: 1 | -1 = (e.key === "P" || e.key === "p") ? -1 : 1;
        let next = matchIdxRef.current + dir;
        if (next < 0) next = matchNodes.length - 1;
        if (next >= matchNodes.length) next = 0;
        matchIdxRef.current = next;
        setMatchIdx(next);
        matchNodes[next].scrollIntoView({ block: "center", behavior: "smooth" });
        matchNodes.forEach((n) => n.classList.remove("ring-2", "ring-primary"));
        matchNodes[next].classList.add("ring-2", "ring-primary");
        e.preventDefault();
        return;
      }

      const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-diff-change="true"]'));
      if (nodes.length === 0) return;
      const move = (dir: 1 | -1) => {
        let next = changeIdxRef.current + dir;
        if (next < 0) next = nodes.length - 1;
        if (next >= nodes.length) next = 0;
        changeIdxRef.current = next;
        setChangeIdx(next);
        nodes[next].scrollIntoView({ block: "center", behavior: "smooth" });
        nodes.forEach((n) => n.classList.remove("ring-2", "ring-primary"));
        nodes[next].classList.add("ring-2", "ring-primary");
      };
      if (e.key === "n" || e.key === "N") { e.preventDefault(); move(1); }
      else if (e.key === "p" || e.key === "P") { e.preventDefault(); move(-1); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [submission, tab, query]);

  // Clean URL params when closing.
  const handleClose = () => {
    try {
      const url = new URL(window.location.href);
      ["histTab", "histLeft", "histRight", "histOnly", "histQ", "histAtts", "histOnlyM", "histM"].forEach((k) => url.searchParams.delete(k));
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

  // Search filter — case-insensitive match on either side of any diff row.
  const q = query.trim().toLowerCase();
  const matches = (s: string) => !q || (s || "").toLowerCase().includes(q);
  const filterByQuery = (rs: DiffRow[]) => !q || !onlyMatches ? rs : rs.filter((r) => matches(r.left.text) || matches(r.right.text));

  const notesRows = useMemo(() => {
    const filtered = filterByQuery(notesRowsAll);
    return onlyChanges ? filterChangedRows(filtered) : filtered;
  }, [notesRowsAll, onlyChanges, q, onlyMatches]);
  const fbRows = useMemo(() => {
    const filtered = filterByQuery(fbRowsAll);
    return onlyChanges ? filterChangedRows(filtered) : filtered;
  }, [fbRowsAll, onlyChanges, q, onlyMatches]);

  // Attachment diff: support multiple attachments per snapshot. The persisted
  // fields can hold a single URL or a delimited list (newline / comma / pipe);
  // names are paired positionally and fall back to "attachment".
  type Att = { name: string; url: string };
  const parseAtts = (row: HistoryRow | null): Att[] => {
    if (!row || !row.attachment_url) return [];
    const urls = row.attachment_url.split(/[\n,|]+/).map((s) => s.trim()).filter(Boolean);
    const names = (row.attachment_name || "").split(/[\n,|]+/).map((s) => s.trim());
    return urls.map((url, i) => ({ url, name: names[i] || names[0] || "attachment" }));
  };
  const leftAtts = useMemo(() => parseAtts(left), [left]);
  const rightAtts = useMemo(() => parseAtts(right), [right]);
  const leftUrlSet = useMemo(() => new Set(leftAtts.map((a) => a.url)), [leftAtts]);
  const rightUrlSet = useMemo(() => new Set(rightAtts.map((a) => a.url)), [rightAtts]);
  const removedAttsAll = useMemo(() => leftAtts.filter((a) => !rightUrlSet.has(a.url)), [leftAtts, rightUrlSet]);
  const addedAttsAll = useMemo(() => rightAtts.filter((a) => !leftUrlSet.has(a.url)), [rightAtts, leftUrlSet]);
  const unchangedAttsAll = useMemo(() => leftAtts.filter((a) => rightUrlSet.has(a.url)), [leftAtts, rightUrlSet]);
  const filterAtts = (atts: Att[]) => !q || !onlyMatches ? atts : atts.filter((a) => a.name.toLowerCase().includes(q));
  const removedAtts = filterAtts(removedAttsAll);
  const addedAtts = filterAtts(addedAttsAll);
  const unchangedAtts = filterAtts(unchangedAttsAll);
  const sameAtt = removedAttsAll.length === 0 && addedAttsAll.length === 0 && unchangedAttsAll.length > 0;
  // Single-item shortcuts retained for the export helper signature.
  const removedAtt = removedAttsAll[0] || null;
  const addedAtt = addedAttsAll[0] || null;
  const leftAtt = leftAtts[0] || null;
  const rightAtt = rightAtts[0] || null;

  // If the search query matches any attachment name, auto-expand the
  // attachments panel so the highlighted matches inside actually render and
  // are reachable via Shift+N/Shift+P navigation.
  const hasAttMatch =
    !!q && (
      removedAttsAll.some((a) => a.name.toLowerCase().includes(q)) ||
      addedAttsAll.some((a) => a.name.toLowerCase().includes(q)) ||
      unchangedAttsAll.some((a) => a.name.toLowerCase().includes(q))
    );
  useEffect(() => {
    if (hasAttMatch && !attsOpen) setAttsOpen(true);
  }, [hasAttMatch, attsOpen]);

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
                const attAdded = addedAtts.length;
                const attRemoved = removedAtts.length;
                const notesChanged = notesC.added + notesC.removed;
                const fbChanged = fbC.added + fbC.removed;
                const totalChanged = notesChanged + fbChanged;
                const goToChange = (dir: 1 | -1) => {
                  const root = compareRef.current;
                  if (!root) return;
                  const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-diff-change="true"]'));
                  if (nodes.length === 0) return;
                  let next = (changeIdxRef.current + dir);
                  if (next < 0) next = nodes.length - 1;
                  if (next >= nodes.length) next = 0;
                  changeIdxRef.current = next;
                  setChangeIdx(next);
                  setChangeTotal(nodes.length);
                  nodes[next].scrollIntoView({ block: "center", behavior: "smooth" });
                  nodes.forEach((n) => n.classList.remove("ring-2", "ring-primary"));
                  nodes[next].classList.add("ring-2", "ring-primary");
                };
                const goToMatch = (dir: 1 | -1) => {
                  const root = compareRef.current;
                  if (!root) return;
                  const nodes = Array.from(root.querySelectorAll<HTMLElement>('mark[data-hl="true"]'));
                  if (nodes.length === 0) return;
                  let next = matchIdxRef.current + dir;
                  if (next < 0) next = nodes.length - 1;
                  if (next >= nodes.length) next = 0;
                  matchIdxRef.current = next;
                  setMatchIdx(next);
                  setMatchTotal(nodes.length);
                  nodes[next].scrollIntoView({ block: "center", behavior: "smooth" });
                  nodes.forEach((n) => n.classList.remove("ring-2", "ring-primary"));
                  nodes[next].classList.add("ring-2", "ring-primary");
                };
                const visibleChanges = changeTotal;
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
                        <div className="flex items-center gap-2">
                          <Switch id="only-matches" checked={onlyMatches} onCheckedChange={setOnlyMatches} disabled={!q} />
                          <Label htmlFor="only-matches" className={`text-xs cursor-pointer ${!q ? "opacity-50" : ""}`}>Show only matches</Label>
                        </div>
                        <div className="flex items-center gap-1" role="group" aria-label="Navigate between changes">
                          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => goToChange(-1)} title="Previous change (P)" aria-label="Previous change" disabled={visibleChanges === 0}>
                            <ChevronUp className="h-3.5 w-3.5" />
                          </Button>
                          <span className="text-[10px] text-muted-foreground tabular-nums min-w-[60px] text-center" aria-live="polite">
                            {visibleChanges === 0 ? "0 / 0 changes" : `${Math.min(changeIdx + 1, visibleChanges)} / ${visibleChanges} changes`}
                          </span>
                          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => goToChange(1)} title="Next change (N)" aria-label="Next change" disabled={visibleChanges === 0}>
                            <ChevronDown className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-1" role="group" aria-label="Navigate between keyword matches">
                          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => goToMatch(-1)} title="Previous match (Shift+P)" aria-label="Previous match" disabled={matchTotal === 0}>
                            <Search className="h-3 w-3 mr-0.5" /><ChevronUp className="h-3 w-3" />
                          </Button>
                          <span className="text-[10px] text-muted-foreground tabular-nums min-w-[60px] text-center" aria-live="polite">
                            {matchTotal === 0 ? "0 / 0 matches" : `${Math.min(matchIdx + 1, matchTotal)} / ${matchTotal} matches`}
                          </span>
                          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => goToMatch(1)} title="Next match (Shift+N)" aria-label="Next match" disabled={matchTotal === 0}>
                            <Search className="h-3 w-3 mr-0.5" /><ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(window.location.href);
                              setLinkCopied(true);
                              toast({ title: "Compare link copied", description: "Share to open this exact view." });
                              setTimeout(() => setLinkCopied(false), 1500);
                            } catch {
                              toast({ title: "Could not copy link", variant: "destructive" });
                            }
                          }}
                          title="Copy a shareable link to this exact compare state"
                        >
                          {linkCopied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />} Copy compare link
                        </Button>
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
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <Input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Filter notes, feedback, and attachment names…"
                          className="h-8 pl-7 pr-7 text-xs"
                          aria-label="Filter diff by keyword"
                        />
                        {query && (
                          <button
                            type="button"
                            onClick={() => setQuery("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            aria-label="Clear search"
                          >
                            <XIcon className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      {query && (
                        <Badge
                          variant="outline"
                          className="text-[10px] tabular-nums shrink-0"
                          aria-live="polite"
                          aria-label={`Match ${matchTotal === 0 ? 0 : Math.min(matchIdx + 1, matchTotal)} of ${matchTotal}`}
                        >
                          Match {matchTotal === 0 ? 0 : Math.min(matchIdx + 1, matchTotal)} of {matchTotal}
                        </Badge>
                      )}
                    </div>
                    {query && matchTotal === 0 && (
                      <div
                        role="status"
                        aria-live="polite"
                        className="rounded border border-dashed bg-background/60 px-3 py-2 flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Search className="h-3.5 w-3.5" />
                          No matches for <span className="font-medium text-foreground">"{query}"</span> in notes, feedback or attachments.
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs shrink-0"
                          onClick={() => {
                            setQuery("");
                            matchIdxRef.current = -1;
                            setMatchIdx(0);
                            setMatchTotal(0);
                            pendingMatchRef.current = null;
                          }}
                        >
                          <XIcon className="h-3.5 w-3.5 mr-1" /> Clear search
                        </Button>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] pt-1 border-t border-border/50">
                      <span className="text-muted-foreground">Breakdown:</span>
                      <Badge variant="outline" className="text-[10px]">
                        <StickyNote className="h-2.5 w-2.5 mr-1" /> Notes: {notesChanged}
                        <span className="ml-1 text-success">+{notesC.added}</span>
                        <span className="ml-1 text-destructive ml-1">-{notesC.removed}</span>
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        <MessageSquare className="h-2.5 w-2.5 mr-1" /> Feedback: {fbChanged}
                        <span className="ml-1 text-success">+{fbC.added}</span>
                        <span className="ml-1 text-destructive">-{fbC.removed}</span>
                      </Badge>
                      {q && <span className="text-muted-foreground italic">· filtered by "{query}"</span>}
                      <span className="ml-auto text-[10px] text-muted-foreground hidden sm:inline" title="Keyboard shortcuts">
                        <kbd className="px-1 py-0.5 rounded border bg-background">N</kbd>/<kbd className="px-1 py-0.5 rounded border bg-background">P</kbd> change · <kbd className="px-1 py-0.5 rounded border bg-background">⇧N</kbd>/<kbd className="px-1 py-0.5 rounded border bg-background">⇧P</kbd> match · <kbd className="px-1 py-0.5 rounded border bg-background">Esc</kbd> clear
                      </span>
                    </div>
                    {leftId && rightId && leftId === rightId && (
                      <div className="text-xs text-muted-foreground italic">Pick two different versions to see a diff.</div>
                    )}
                  </div>
                );
              })()}

              <div ref={compareRef} className="space-y-4">
                {/* Attachments diff (multi-file aware) */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setAttsOpen((o) => !o)}
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                      aria-expanded={attsOpen}
                      aria-controls="attachments-diff-panel"
                    >
                      <ChevronRight className={`h-3.5 w-3.5 transition-transform ${attsOpen ? "rotate-90" : ""}`} />
                      <Paperclip className="h-3.5 w-3.5" /> Attachments
                    </button>
                    <span className="flex items-center gap-1 text-[10px] font-normal text-muted-foreground">
                      <Badge variant="outline" className="text-[10px] bg-success/10 text-success border-success/30">+{addedAtts.length}</Badge>
                      <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30">-{removedAtts.length}</Badge>
                      {unchangedAtts.length > 0 && <Badge variant="outline" className="text-[10px]">{unchangedAtts.length} unchanged</Badge>}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-[10px] ml-1"
                        onClick={() => setAttsOpen((o) => !o)}
                        aria-label={attsOpen ? "Collapse attachments" : "Expand attachments"}
                      >
                        {attsOpen ? "Collapse" : "Expand"}
                      </Button>
                    </span>
                  </div>
                  {!attsOpen ? null : leftAtts.length === 0 && rightAtts.length === 0 ? (
                    <div id="attachments-diff-panel" className="text-[11px] text-muted-foreground italic px-1">No attachments on either version.</div>
                  ) : (
                    <div id="attachments-diff-panel" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="rounded border bg-background overflow-hidden">
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground px-2 py-1 border-b bg-muted/30 flex items-center justify-between">
                          <span>Removed (left)</span>
                          <span>{removedAtts.length}</span>
                        </div>
                        <div className="p-2 space-y-1.5">
                          {removedAtts.length === 0 ? (
                            <div className="text-[11px] text-muted-foreground italic">— none —</div>
                          ) : removedAtts.map((a) => (
                            <div key={`r-${a.url}`} className="flex items-center justify-between gap-2 text-xs bg-destructive/10 rounded p-2" data-diff-change="true">
                              <span className="flex items-center gap-1.5 min-w-0"><Minus className="h-3 w-3 text-destructive shrink-0" /><span className="truncate" title={a.name}><Highlight text={a.name} query={query} /></span></span>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button asChild size="sm" variant="ghost" className="h-6 px-1.5"><a href={a.url} target="_blank" rel="noreferrer" aria-label={`Open ${a.name}`}><ExternalLink className="h-3 w-3" /></a></Button>
                                <Button asChild size="sm" variant="outline" className="h-6 px-1.5 text-[11px]"><a href={a.url} download={a.name} aria-label={`Download ${a.name}`}><Download className="h-3 w-3" /></a></Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="rounded border bg-background overflow-hidden">
                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground px-2 py-1 border-b bg-muted/30 flex items-center justify-between">
                          <span>Added (right)</span>
                          <span>{addedAtts.length}</span>
                        </div>
                        <div className="p-2 space-y-1.5">
                          {addedAtts.length === 0 ? (
                            <div className="text-[11px] text-muted-foreground italic">— none —</div>
                          ) : addedAtts.map((a) => (
                            <div key={`a-${a.url}`} className="flex items-center justify-between gap-2 text-xs bg-success/10 rounded p-2" data-diff-change="true">
                              <span className="flex items-center gap-1.5 min-w-0"><Plus className="h-3 w-3 text-success shrink-0" /><span className="truncate" title={a.name}><Highlight text={a.name} query={query} /></span></span>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button asChild size="sm" variant="ghost" className="h-6 px-1.5"><a href={a.url} target="_blank" rel="noreferrer" aria-label={`Open ${a.name}`}><ExternalLink className="h-3 w-3" /></a></Button>
                                <Button asChild size="sm" variant="outline" className="h-6 px-1.5 text-[11px]"><a href={a.url} download={a.name} aria-label={`Download ${a.name}`}><Download className="h-3 w-3" /></a></Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {unchangedAtts.length > 0 && (
                        <div className="rounded border bg-muted/20 overflow-hidden sm:col-span-2">
                          <div className="text-[11px] uppercase tracking-wide text-muted-foreground px-2 py-1 border-b bg-muted/30 flex items-center justify-between">
                            <span>Unchanged (in both)</span>
                            <span>{unchangedAtts.length}</span>
                          </div>
                          <div className="p-2 space-y-1.5">
                            {unchangedAtts.map((a) => (
                              <div key={`u-${a.url}`} className="flex items-center justify-between gap-2 text-xs">
                                <span className="flex items-center gap-1.5 min-w-0"><FileText className="h-3 w-3 text-muted-foreground shrink-0" /><span className="truncate" title={a.name}><Highlight text={a.name} query={query} /></span></span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button asChild size="sm" variant="ghost" className="h-6 px-1.5"><a href={a.url} target="_blank" rel="noreferrer" aria-label={`Open ${a.name}`}><ExternalLink className="h-3 w-3" /></a></Button>
                                  <Button asChild size="sm" variant="outline" className="h-6 px-1.5 text-[11px]"><a href={a.url} download={a.name} aria-label={`Download ${a.name}`}><Download className="h-3 w-3" /></a></Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold flex items-center gap-1"><StickyNote className="h-3.5 w-3.5" /> Student notes</div>
                  <AlignedDiff section="notes" rows={notesRows} leftLabel={left ? labelFor(left) : "Left"} rightLabel={right ? labelFor(right) : "Right"} query={query} />
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> Trainer feedback</div>
                  <AlignedDiff section="feedback" rows={fbRows} leftLabel={left ? labelFor(left) : "Left"} rightLabel={right ? labelFor(right) : "Right"} query={query} />
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
