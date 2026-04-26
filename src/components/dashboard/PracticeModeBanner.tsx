import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getFallbackState,
  getRestoredState,
  subscribeChatDebug,
  clearFallbackState,
  clearRestoredState,
  startCreditsRestoredWatcher,
} from "@/lib/aiChatDebug";

const STATUS_LABEL: Record<number, string> = {
  402: "AI credits exhausted",
  429: "Rate limited (too many requests)",
  500: "AI gateway error",
  502: "AI gateway error",
  503: "AI service unavailable",
};

const PracticeModeBanner = () => {
  const [state, setState] = useState(getFallbackState());
  const [restored, setRestored] = useState(getRestoredState());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Kick off the background watcher so credits-restored is detected
    // automatically (without waiting for the next student prompt).
    startCreditsRestoredWatcher();

    const unsub = subscribeChatDebug(() => {
      setState(getFallbackState());
      const r = getRestoredState();
      setRestored(r);
      if (r.restored) {
        setDismissed(false);
        // Auto-clear restored notice after 12s.
        window.setTimeout(() => {
          clearRestoredState();
          setRestored({ restored: false });
        }, 12_000);
      }
    });
    return unsub;
  }, []);

  if (state.active && !dismissed) {
    const label = STATUS_LABEL[state.status || 0] || state.reason || "AI temporarily unavailable";
    const since = state.since ? new Date(state.since).toLocaleTimeString() : "";
    const streamFlag = state.fallbackStreaming === false ? "non-streaming" : "streaming";
    return (
      <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 flex items-start gap-3" role="status">
        <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-card-foreground">
            🧪 Practice Mode active — {label}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            You're seeing cached example answers so you can keep practicing prompts.
            Live AI responses will resume automatically once it's restored.
            {since && ` (since ${since})`}
          </p>
          {state.fallbackKey && (
            <p className="text-[11px] text-muted-foreground mt-1 font-mono">
              Cached example: <span className="text-card-foreground">{state.fallbackTitle || state.fallbackKey}</span>
              <span className="opacity-70"> · key=<code className="bg-muted/60 px-1 rounded">{state.fallbackKey}</code></span>
              <span className="opacity-70"> · served via {streamFlag}</span>
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  if (restored.restored) {
    const via = restored.via === "auto_probe" ? "detected automatically" : "detected on your next chat";
    return (
      <div className="rounded-lg border border-success/40 bg-success/10 px-4 py-3 flex items-start gap-3" role="status">
        <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-card-foreground">
            ✅ Live AI restored — Practice Mode is off.
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your next chat will use the real model again ({via}).
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={() => { clearRestoredState(); clearFallbackState(); setRestored({ restored: false }); }}
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return null;
};

export default PracticeModeBanner;
