/**
 * Lightweight per-section performance instrumentation.
 *
 * Tracks two things per logical "section" (e.g. "ai_path", "modules", "playground"):
 *   • renderMs  — time from section mount → first idle frame
 *   • apiMs     — average duration of fetch/xhr requests fired during that mount
 *
 * Stored in localStorage so it survives reloads and can power a small dashboard
 * panel. Capped at the latest 50 samples per section.
 */

export interface PerfSample {
  section: string;
  renderMs: number;
  apiMs: number;
  apiCount: number;
  ts: number;
}

const KEY = "lovable.perf.samples.v1";
const MAX_PER_SECTION = 50;

function read(): PerfSample[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PerfSample[]) : [];
  } catch {
    return [];
  }
}

function write(samples: PerfSample[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(samples));
  } catch {
    /* quota — ignore */
  }
}

export function recordSample(sample: PerfSample) {
  const all = read();
  all.push(sample);
  // keep at most MAX_PER_SECTION newest samples per section
  const grouped = new Map<string, PerfSample[]>();
  for (const s of all) {
    const arr = grouped.get(s.section) ?? [];
    arr.push(s);
    grouped.set(s.section, arr);
  }
  const trimmed: PerfSample[] = [];
  grouped.forEach((arr) => {
    arr.sort((a, b) => a.ts - b.ts);
    trimmed.push(...arr.slice(-MAX_PER_SECTION));
  });
  write(trimmed);
  // also broadcast for live consumers (the perf panel)
  window.dispatchEvent(new CustomEvent("lovable:perf-sample", { detail: sample }));
}

export function getSamples(): PerfSample[] {
  return read();
}

export function clearSamples() {
  write([]);
}

export interface SectionStats {
  section: string;
  samples: number;
  avgRenderMs: number;
  p95RenderMs: number;
  avgApiMs: number;
  totalApiCalls: number;
  lastTs: number;
}

export function summarizeBySection(): SectionStats[] {
  const grouped = new Map<string, PerfSample[]>();
  for (const s of read()) {
    const arr = grouped.get(s.section) ?? [];
    arr.push(s);
    grouped.set(s.section, arr);
  }
  const out: SectionStats[] = [];
  grouped.forEach((arr, section) => {
    const renders = arr.map((a) => a.renderMs).sort((a, b) => a - b);
    const apis = arr.map((a) => a.apiMs);
    const p95Idx = Math.max(0, Math.ceil(renders.length * 0.95) - 1);
    out.push({
      section,
      samples: arr.length,
      avgRenderMs: renders.reduce((a, b) => a + b, 0) / renders.length,
      p95RenderMs: renders[p95Idx],
      avgApiMs: apis.reduce((a, b) => a + b, 0) / Math.max(1, apis.length),
      totalApiCalls: arr.reduce((a, b) => a + b.apiCount, 0),
      lastTs: Math.max(...arr.map((a) => a.ts)),
    });
  });
  return out.sort((a, b) => b.avgRenderMs - a.avgRenderMs);
}

/* ----- fetch instrumentation (installed once) ----- */

let installed = false;
const apiBuckets: { durations: number[] }[] = [];

export function pushApiBucket() {
  apiBuckets.push({ durations: [] });
}
export function popApiBucket(): { avg: number; count: number } {
  const b = apiBuckets.pop();
  if (!b || b.durations.length === 0) return { avg: 0, count: 0 };
  const avg = b.durations.reduce((a, c) => a + c, 0) / b.durations.length;
  return { avg, count: b.durations.length };
}

export function installFetchTimer() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const orig = window.fetch.bind(window);
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const start = performance.now();
    try {
      const res = await orig(...args);
      const dur = performance.now() - start;
      apiBuckets.forEach((b) => b.durations.push(dur));
      return res;
    } catch (e) {
      const dur = performance.now() - start;
      apiBuckets.forEach((b) => b.durations.push(dur));
      throw e;
    }
  };
}
