import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFallbackState, subscribeChatDebug, clearFallbackState } from "@/lib/aiChatDebug";

const STATUS_LABEL: Record<number, string> = {
  402: "AI credits exhausted",
  429: "Rate limited (too many requests)",
  500: "AI gateway error",
  502: "AI gateway error",
  503: "AI service unavailable",
};

const PracticeModeBanner = () => {
  const [state, setState] = useState(getFallbackState());
  const [restored, setRestored] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const unsub = subscribeChatDebug(() => {
      const next = getFallbackState();
      setState((prev) => {
        // Detect transition: was active → now inactive ⇒ credits restored.
        if (prev.active && !next.active) {
          setRestored(Date.now());
          setDismissed(false);
          // Auto-clear restored notice after 10s.
          setTimeout(() => setRestored(null), 10000);
        }
        return next;
      });
    });
    return unsub;
  }, []);

  if (state.active && !dismissed) {
    const label = STATUS_LABEL[state.status || 0] || state.reason || "AI temporarily unavailable";
    const since = state.since ? new Date(state.since).toLocaleTimeString() : "";
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

  if (restored) {
    return (
      <div className="rounded-lg border border-success/40 bg-success/10 px-4 py-3 flex items-start gap-3" role="status">
        <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-card-foreground">
            ✅ Live AI restored — Practice Mode is off.
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Your next chat will use the real model again.</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={() => { setRestored(null); clearFallbackState(); }}
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
