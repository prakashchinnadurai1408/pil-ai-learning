// Shared client-side state for AI chat diagnostics.
// - Last chat attempt details (admin debug panel)
// - Fallback / Practice Mode active flag (student banner)

export interface LastChatAttempt {
  timestamp: number;
  feature: string;
  model?: string;
  upstreamStatus: number; // 0 = no upstream error
  errorReason?: string;
  fallbackUsed: boolean;
  fallbackKey?: string; // which cached example was served
  durationMs: number;
}

const LAST_KEY = "ai_chat_last_attempt";
const FALLBACK_KEY = "ai_chat_fallback_active";

type Listener = () => void;
const listeners = new Set<Listener>();

export function recordChatAttempt(a: LastChatAttempt) {
  try {
    sessionStorage.setItem(LAST_KEY, JSON.stringify(a));
  } catch { /* ignore */ }

  if (a.fallbackUsed) {
    try {
      localStorage.setItem(FALLBACK_KEY, JSON.stringify({ since: a.timestamp, status: a.upstreamStatus, reason: a.errorReason || "" }));
    } catch { /* ignore */ }
  } else if (a.upstreamStatus === 0 || (a.upstreamStatus >= 200 && a.upstreamStatus < 300)) {
    // Live success — clear fallback flag.
    try { localStorage.removeItem(FALLBACK_KEY); } catch { /* ignore */ }
  }
  listeners.forEach((l) => l());
  // Cross-tab notification
  try { window.dispatchEvent(new CustomEvent("ai-chat-attempt")); } catch { /* ignore */ }
}

export function getLastChatAttempt(): LastChatAttempt | null {
  try {
    const raw = sessionStorage.getItem(LAST_KEY);
    return raw ? JSON.parse(raw) as LastChatAttempt : null;
  } catch { return null; }
}

export function getFallbackState(): { active: boolean; since?: number; status?: number; reason?: string } {
  try {
    const raw = localStorage.getItem(FALLBACK_KEY);
    if (!raw) return { active: false };
    const v = JSON.parse(raw);
    return { active: true, since: v.since, status: v.status, reason: v.reason };
  } catch { return { active: false }; }
}

export function clearFallbackState() {
  try { localStorage.removeItem(FALLBACK_KEY); } catch { /* ignore */ }
  listeners.forEach((l) => l());
  try { window.dispatchEvent(new CustomEvent("ai-chat-attempt")); } catch { /* ignore */ }
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
