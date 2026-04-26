// Shared client-side state for AI chat diagnostics.
// - Last chat attempt details (admin debug panel)
// - Fallback / Practice Mode active flag (student banner)
// - Background watcher that auto-detects when credits are restored

export interface LastChatAttempt {
  timestamp: number;
  feature: string;
  model?: string;
  upstreamStatus: number; // 0 = no upstream error
  errorReason?: string;
  fallbackUsed: boolean;
  fallbackKey?: string;       // which cached example was served
  fallbackTitle?: string;     // human-readable label for the cached example
  fallbackStreaming?: boolean; // whether the fallback was served in place of a streaming or non-streaming call
  durationMs: number;
}

const LAST_KEY = "ai_chat_last_attempt";
const FALLBACK_KEY = "ai_chat_fallback_active";
const RESTORED_KEY = "ai_chat_credits_restored";

type Listener = () => void;
const listeners = new Set<Listener>();

const notify = () => {
  listeners.forEach((l) => l());
  try { window.dispatchEvent(new CustomEvent("ai-chat-attempt")); } catch { /* ignore */ }
};

export function recordChatAttempt(a: LastChatAttempt) {
  try {
    sessionStorage.setItem(LAST_KEY, JSON.stringify(a));
  } catch { /* ignore */ }

  const wasActive = getFallbackState().active;

  if (a.fallbackUsed) {
    try {
      localStorage.setItem(
        FALLBACK_KEY,
        JSON.stringify({
          since: a.timestamp,
          status: a.upstreamStatus,
          reason: a.errorReason || "",
          fallbackKey: a.fallbackKey || "",
          fallbackTitle: a.fallbackTitle || "",
          fallbackStreaming: a.fallbackStreaming ?? true,
        }),
      );
    } catch { /* ignore */ }
  } else if (a.upstreamStatus === 0 || (a.upstreamStatus >= 200 && a.upstreamStatus < 300)) {
    // Live success — clear fallback flag, mark restored if we were just in fallback.
    try { localStorage.removeItem(FALLBACK_KEY); } catch { /* ignore */ }
    if (wasActive) {
      try {
        localStorage.setItem(RESTORED_KEY, JSON.stringify({ at: Date.now(), via: "live_attempt" }));
      } catch { /* ignore */ }
    }
  }
  notify();
}

export function getLastChatAttempt(): LastChatAttempt | null {
  try {
    const raw = sessionStorage.getItem(LAST_KEY);
    return raw ? JSON.parse(raw) as LastChatAttempt : null;
  } catch { return null; }
}

export interface FallbackState {
  active: boolean;
  since?: number;
  status?: number;
  reason?: string;
  fallbackKey?: string;
  fallbackTitle?: string;
  fallbackStreaming?: boolean;
}

export function getFallbackState(): FallbackState {
  try {
    const raw = localStorage.getItem(FALLBACK_KEY);
    if (!raw) return { active: false };
    const v = JSON.parse(raw);
    return {
      active: true,
      since: v.since,
      status: v.status,
      reason: v.reason,
      fallbackKey: v.fallbackKey,
      fallbackTitle: v.fallbackTitle,
      fallbackStreaming: v.fallbackStreaming,
    };
  } catch { return { active: false }; }
}

export function clearFallbackState() {
  try { localStorage.removeItem(FALLBACK_KEY); } catch { /* ignore */ }
  notify();
}

export interface RestoredState {
  restored: boolean;
  at?: number;
  via?: string; // "live_attempt" | "auto_probe"
}

export function getRestoredState(): RestoredState {
  try {
    const raw = localStorage.getItem(RESTORED_KEY);
    if (!raw) return { restored: false };
    const v = JSON.parse(raw);
    return { restored: true, at: v.at, via: v.via };
  } catch { return { restored: false }; }
}

export function clearRestoredState() {
  try { localStorage.removeItem(RESTORED_KEY); } catch { /* ignore */ }
  notify();
}

/** Mark credits restored explicitly (e.g. from a background probe). */
export function markCreditsRestored(via: string = "auto_probe") {
  try { localStorage.removeItem(FALLBACK_KEY); } catch { /* ignore */ }
  try { localStorage.setItem(RESTORED_KEY, JSON.stringify({ at: Date.now(), via })); } catch { /* ignore */ }
  notify();
}

export function subscribeChatDebug(listener: Listener): () => void {
  listeners.add(listener);
  const handler = () => listener();
  window.addEventListener("ai-chat-attempt", handler);
  window.addEventListener("storage", handler);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("ai-chat-attempt", handler);
    window.removeEventListener("storage", handler);
  };
}

// ─── Background credits-restored watcher ──────────────────────────────────────
// Polls the chat edge function (cheap nonStream "ping") while fallback is active.
// On a successful live response, marks credits restored so admins + students
// see the banner immediately, instead of waiting for the next student prompt.

let probeTimer: number | null = null;
const PROBE_INTERVAL_MS = 60_000; // 1 minute

async function probeOnce(): Promise<boolean> {
  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: "ping" }],
        nonStream: true,
        featureTag: "credits_restored_probe",
      }),
    });
    if (!resp.ok) return false;
    const ct = resp.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const data = await resp.json().catch(() => ({}));
      if (data?.fallback) return false;
      if (data?.error) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function startCreditsRestoredWatcher() {
  if (typeof window === "undefined") return;
  if (probeTimer !== null) return; // already running
  const tick = async () => {
    if (!getFallbackState().active) return; // nothing to do
    const ok = await probeOnce();
    if (ok) markCreditsRestored("auto_probe");
  };
  probeTimer = window.setInterval(tick, PROBE_INTERVAL_MS);
  // Run one probe shortly after start so we don't wait a full minute.
  window.setTimeout(tick, 5_000);
}

export function stopCreditsRestoredWatcher() {
  if (probeTimer !== null) {
    clearInterval(probeTimer);
    probeTimer = null;
  }
}
