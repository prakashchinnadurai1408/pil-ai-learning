import { useEffect, useRef, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";

export type LiveStatus = "connecting" | "connected" | "disconnected";

interface LiveStatusIndicatorProps {
  status: LiveStatus;
  lastEventAt: Date | null;
  /** When true (default), polite announcements are sent to a screen reader live region. */
  announce?: boolean;
}

/**
 * Live status pill — shows whether the realtime websocket is connected and
 * how many seconds ago the last payload arrived.
 *
 * Accessibility:
 *  - The visual pill is marked aria-hidden so SR users only get the curated message.
 *  - A visually-hidden polite live region announces meaningful transitions
 *    (status changes, becoming stale, recovering) without spamming on every
 *    1-second tick.
 *  - The wrapper exposes role="status" with an aria-label summarising state.
 */
export const LiveStatusIndicator = ({
  status,
  lastEventAt,
  announce = true,
}: LiveStatusIndicatorProps) => {
  const ageSec = lastEventAt
    ? Math.max(0, Math.floor((Date.now() - lastEventAt.getTime()) / 1000))
    : null;

  const ageLabel =
    ageSec === null
      ? "no events yet"
      : ageSec < 60
        ? `${ageSec}s ago`
        : `${Math.floor(ageSec / 60)}m ${ageSec % 60}s ago`;

  // Treat the channel as "stale" if we're connected but haven't received a
  // payload in a long time.
  const stale = status === "connected" && ageSec !== null && ageSec > 120;

  const tone =
    status === "connected" && !stale
      ? "border-success/40 bg-success/10 text-success"
      : status === "connected" && stale
        ? "border-warning/40 bg-warning/10 text-warning"
        : status === "connecting"
          ? "border-muted-foreground/30 bg-muted text-muted-foreground"
          : "border-destructive/40 bg-destructive/10 text-destructive";

  const Icon = status === "disconnected" ? WifiOff : Wifi;

  const label =
    status === "connected"
      ? stale
        ? "Live · idle"
        : "Live"
      : status === "connecting"
        ? "Connecting…"
        : "Offline";

  const description =
    status === "connected"
      ? stale
        ? `Realtime channel is connected but idle. Last update ${ageLabel}.`
        : `Realtime channel is connected. Last update ${ageLabel}.`
      : status === "connecting"
        ? "Connecting to the realtime channel…"
        : "Realtime channel is disconnected. Falling back to periodic refresh. Updates may lag by up to 30 seconds.";

  // ── Screen-reader announcements ────────────────────────────────────────
  // Only announce when the *meaningful* state changes — not every 1Hz tick —
  // otherwise SR users would hear a constant stream of countdown noise.
  const [announcement, setAnnouncement] = useState("");
  const lastKeyRef = useRef<string>("");

  useEffect(() => {
    if (!announce) return;
    const key = `${status}|${stale ? "stale" : "fresh"}|${lastEventAt === null ? "none" : "some"}`;
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;

    const message =
      status === "connected"
        ? stale
          ? "Realtime updates idle. The connection is healthy but no recent activity."
          : "Realtime updates connected."
        : status === "connecting"
          ? "Connecting to realtime updates."
          : "Realtime updates disconnected. Using periodic refresh as a fallback.";
    setAnnouncement(message);
  }, [status, stale, lastEventAt, announce]);

  return (
    <>
      <div
        role="status"
        aria-label={`Realtime status: ${label}. ${description}`}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${tone}`}
      >
        <span aria-hidden="true" className="relative flex h-2 w-2">
          {status === "connected" && !stale && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
          )}
          <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
        </span>
        <Icon aria-hidden="true" className="h-3 w-3" />
        <span aria-hidden="true">{label}</span>
        <span aria-hidden="true" className="opacity-70">
          · {ageLabel}
        </span>
      </div>

      {announce && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
          data-testid="live-status-sr-announcer"
        >
          {announcement}
        </div>
      )}
    </>
  );
};

export default LiveStatusIndicator;
