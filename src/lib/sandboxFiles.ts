// Lightweight client-side helpers for the AI Tools Sandbox file uploads.
import * as pdfjsLib from "pdfjs-dist";
import Papa from "papaparse";

// pdfjs requires a worker. Use the matching CDN worker for the installed version.
// @ts-ignore — version is exported at runtime
const PDFJS_VERSION = (pdfjsLib as any).version || "4.7.76";
pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;

export async function extractPdfText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const maxPages = Math.min(pdf.numPages, 50);
  let out = "";
  for (let p = 1; p <= maxPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((it: any) => (typeof it?.str === "string" ? it.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    out += `\n\n--- Page ${p} ---\n${pageText}`;
  }
  if (pdf.numPages > 50) out += `\n\n[Note: Only first 50 of ${pdf.numPages} pages extracted.]`;
  return out.trim();
}

export interface CsvSummary {
  preview: string;          // text block to send to the model
  rowCount: number;
  columnCount: number;
  columns: string[];
}

export async function parseCsvFile(file: File): Promise<CsvSummary> {
  const text = await file.text();
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  const rows = result.data || [];
  const columns = result.meta?.fields || [];
  const previewRows = rows.slice(0, 50);
  // Build a compact markdown table preview the LLM can reason over.
  const header = `| ${columns.join(" | ")} |`;
  const sep = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = previewRows
    .map((r) => `| ${columns.map((c) => String(r[c] ?? "").replace(/\|/g, "\\|")).join(" | ")} |`)
    .join("\n");

  const preview =
    `Dataset: ${file.name}\nRows: ${rows.length} (showing first ${previewRows.length})\nColumns (${columns.length}): ${columns.join(", ")}\n\n${header}\n${sep}\n${body}`;

  return { preview, rowCount: rows.length, columnCount: columns.length, columns };
}

export const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
