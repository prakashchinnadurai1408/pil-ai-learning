import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PAGE = 1000;
const PDF_MAX_ROWS = 5000; // safety: jsPDF in-edge for huge tables is slow; downgrade large PDF jobs to CSV

interface JobRow {
  id: string;
  trainer_id: string;
  trainer_email: string;
  trainer_name: string;
  format: "csv" | "pdf";
  filters: Record<string, any>;
  student_ids: string[];
  estimated_total: number;
  hard_max: number;
  rows_fetched: number;
  pages_fetched: number;
  cursor_created_at: string | null;
  cursor_id: string | null;
  status: string;
  cancel_requested: boolean;
  job_label: string;
}

const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const countAtts = (s: string) =>
  s ? s.split(/[\n,|]+/).map((t) => t.trim()).filter(Boolean).length : 0;

async function runJob(jobId: string) {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: job, error: jerr } = await admin
    .from("trainer_export_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();
  if (jerr || !job) {
    console.error("job not found", jerr);
    return;
  }
  const j = job as JobRow;
  if (j.status !== "queued" && j.status !== "running") return;

  // Possibly downgrade huge PDF jobs to CSV
  let format = j.format;
  let downgraded = false;
  if (format === "pdf" && j.estimated_total > PDF_MAX_ROWS) {
    format = "csv";
    downgraded = true;
  }

  await admin.from("trainer_export_jobs").update({
    status: "running",
    started_at: new Date().toISOString(),
    format,
    format_downgraded: downgraded,
  }).eq("id", j.id);

  const filters = j.filters || {};
  const days = Number(filters.days ?? 14);
  const fCurriculum = filters.curriculum_id || "";
  const fStudent = filters.student_id || "";
  const fStatus = filters.status || "";
  const fActorRole = filters.actor_role || "";
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const studentIds = Array.isArray(j.student_ids) ? j.student_ids : [];
  if (studentIds.length === 0) {
    await finalizeError(admin, j.id, "No students in scope");
    return;
  }

  let cursor: { createdAt: string; id: string } | null =
    j.cursor_created_at && j.cursor_id
      ? { createdAt: j.cursor_created_at, id: j.cursor_id }
      : null;

  const allRows: any[] = [];
  let rowsFetched = j.rows_fetched || 0;
  let pages = j.pages_fetched || 0;
  let truncated = false;

  while (rowsFetched < j.hard_max) {
    // poll cancel each page
    const { data: ck } = await admin
      .from("trainer_export_jobs")
      .select("cancel_requested")
      .eq("id", j.id)
      .maybeSingle();
    if (ck?.cancel_requested) {
      await admin.from("trainer_export_jobs").update({
        status: "canceled",
        completed_at: new Date().toISOString(),
      }).eq("id", j.id);
      return;
    }

    let q = admin
      .from("curriculum_submission_history")
      .select(
        "id, created_at, submission_id, curriculum_id, student_id, student_name, kind, status, version_number, attachment_name, trainer_feedback, notes, actor_role, actor_name",
      )
      .in("student_id", studentIds)
      .gte("created_at", since);
    if (fCurriculum) q = q.eq("curriculum_id", fCurriculum);
    if (fStudent) q = q.eq("student_id", fStudent);
    if (fStatus) q = q.ilike("status", fStatus);
    if (fActorRole) q = q.ilike("actor_role", fActorRole);
    if (cursor) {
      q = q.or(
        `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
      );
    }
    const { data, error } = await q
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(PAGE);
    if (error) {
      await finalizeError(admin, j.id, error.message);
      return;
    }
    const batch = (data as any[]) || [];
    allRows.push(...batch);
    pages += 1;
    rowsFetched = allRows.length + (j.rows_fetched || 0);

    const last = batch[batch.length - 1];
    if (last) cursor = { createdAt: last.created_at, id: last.id };

    await admin.from("trainer_export_jobs").update({
      rows_fetched: rowsFetched,
      pages_fetched: pages,
      cursor_created_at: cursor?.createdAt ?? null,
      cursor_id: cursor?.id ?? null,
    }).eq("id", j.id);

    if (batch.length < PAGE) break;
    if (rowsFetched >= j.hard_max) {
      truncated = true;
      break;
    }
  }

  // Build file
  let body: Uint8Array;
  let mime: string;
  let ext: string;
  if (format === "csv") {
    const header = [
      "created_at","student_id","student_name","curriculum_id","submission_id",
      "kind","version_number","attachments","status","actor_role","actor_name",
      "trainer_feedback","notes",
    ];
    const lines = [header.join(",")];
    for (const r of allRows) {
      lines.push([
        r.created_at, r.student_id, r.student_name || "", r.curriculum_id, r.submission_id,
        r.kind, r.version_number ?? "", countAtts(r.attachment_name || ""),
        r.status, r.actor_role, r.actor_name,
        (r.trainer_feedback || "").replace(/\n/g, " "),
        (r.notes || "").replace(/\n/g, " "),
      ].map(csvCell).join(","));
    }
    body = new TextEncoder().encode(lines.join("\n"));
    mime = "text/csv; charset=utf-8";
    ext = "csv";
  } else {
    // PDF (only when allRows <= PDF_MAX_ROWS)
    const { jsPDF } = await import("https://esm.sh/jspdf@2.5.1");
    // @ts-ignore
    const autoTableMod = await import("https://esm.sh/jspdf-autotable@3.8.2");
    const autoTable = (autoTableMod as any).default || autoTableMod;
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(`Submission Diff Events${j.job_label ? ` · ${j.job_label}` : ""}`, 14, 14);
    doc.setFontSize(9);
    doc.text(
      `Window: last ${days}d · ${allRows.length} rows · exported by ${j.trainer_name} · ${new Date().toLocaleString()}`,
      14, 20,
    );
    autoTable(doc, {
      startY: 28,
      head: [["When","Student","Curriculum","Kind","Ver","Atts","Status","Actor"]],
      body: allRows.map((r) => [
        new Date(r.created_at).toLocaleString(),
        r.student_name || "",
        (r.curriculum_id || "").slice(0, 8),
        r.kind, r.version_number ?? "—",
        countAtts(r.attachment_name || ""),
        r.status || "—",
        r.actor_name || r.actor_role || "—",
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });
    body = new Uint8Array(doc.output("arraybuffer"));
    mime = "application/pdf";
    ext = "pdf";
  }

  const path = `${j.trainer_email}/${j.id}.${ext}`;
  const { error: upErr } = await admin.storage
    .from("trainer-exports")
    .upload(path, body, { contentType: mime, upsert: true });
  if (upErr) {
    await finalizeError(admin, j.id, `upload: ${upErr.message}`);
    return;
  }

  await admin.from("trainer_export_jobs").update({
    status: "done",
    file_path: path,
    file_size_bytes: body.byteLength,
    rows_fetched: allRows.length,
    pages_fetched: pages,
    will_truncate: truncated,
    completed_at: new Date().toISOString(),
  }).eq("id", j.id);
}

async function finalizeError(admin: any, id: string, msg: string) {
  await admin.from("trainer_export_jobs").update({
    status: "error",
    error_message: msg.slice(0, 500),
    completed_at: new Date().toISOString(),
  }).eq("id", id);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { jobId } = await req.json();
    if (!jobId) {
      return new Response(JSON.stringify({ error: "jobId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Run in background so the HTTP request returns immediately.
    // @ts-ignore - EdgeRuntime is available in Supabase edge runtime
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(runJob(jobId).catch((e) => console.error("job error", e)));
    } else {
      runJob(jobId).catch((e) => console.error("job error", e));
    }
    return new Response(JSON.stringify({ ok: true, jobId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
