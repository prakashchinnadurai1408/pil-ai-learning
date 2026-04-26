import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bug, RefreshCw } from "lucide-react";
import { getLastChatAttempt, subscribeChatDebug, type LastChatAttempt } from "@/lib/aiChatDebug";

const statusTone = (s: number) => {
  if (s === 200 || s === 0) return "secondary";
  if (s === 402 || s >= 500) return "destructive";
  return "outline";
};

const reasonHint = (s: number) => {
  if (s === 0) return "No upstream call yet (this session)";
  if (s === 200) return "Live AI responded normally";
  if (s === 402) return "Billing — Lovable AI credits exhausted";
  if (s === 429) return "Rate limit — too many requests";
  if (s >= 500 && s < 600) return "Upstream gateway error";
  if (s >= 400 && s < 500) return "Bad request to chat edge function";
  return "Unclassified";
};

const ChatDebugPanel = () => {
  const [attempt, setAttempt] = useState<LastChatAttempt | null>(getLastChatAttempt());

  useEffect(() => {
    return subscribeChatDebug(() => setAttempt(getLastChatAttempt()));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-2"><Bug className="h-4 w-4 text-primary" /> Chat debug — last attempt</span>
          <Button size="sm" variant="ghost" className="h-7" onClick={() => setAttempt(getLastChatAttempt())}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!attempt ? (
          <p className="text-xs text-muted-foreground py-6 text-center">
            No chat attempt recorded in this admin session yet. Open the AI chat in another tab and ask a question to populate this panel.
          </p>
        ) : (
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Time</dt>
              <dd className="font-mono text-xs">{new Date(attempt.timestamp).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Feature</dt>
              <dd className="font-mono text-xs">{attempt.feature}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Model override</dt>
              <dd className="font-mono text-xs">{attempt.model || "(default from llm_settings)"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Latency</dt>
              <dd className="font-mono text-xs">{attempt.durationMs} ms</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Upstream status</dt>
              <dd className="flex items-center gap-2">
                <Badge variant={statusTone(attempt.upstreamStatus) as any} className="text-xs font-mono">
                  {attempt.upstreamStatus || "n/a"}
                </Badge>
                <span className="text-xs text-muted-foreground">{reasonHint(attempt.upstreamStatus)}</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Fallback used</dt>
              <dd>
                <Badge variant={attempt.fallbackUsed ? "destructive" : "secondary"} className="text-xs">
                  {attempt.fallbackUsed ? `Yes — ${attempt.fallbackTitle || attempt.fallbackKey || "cached"}` : "No (live response)"}
                </Badge>
              </dd>
            </div>
            {attempt.fallbackUsed && (
              <>
                <div>
                  <dt className="text-xs text-muted-foreground">Cached example key</dt>
                  <dd className="font-mono text-xs">
                    <code className="bg-muted/60 px-1.5 py-0.5 rounded">{attempt.fallbackKey || "—"}</code>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Served via</dt>
                  <dd>
                    <Badge variant="outline" className="text-xs">
                      {attempt.fallbackStreaming === false ? "Non-streaming (JSON)" : "Streaming (SSE)"}
                    </Badge>
                  </dd>
                </div>
              </>
            )}
            <div className="md:col-span-2">
              <dt className="text-xs text-muted-foreground">Error reason (from edge function)</dt>
              <dd className="text-xs bg-muted/40 rounded p-2 font-mono whitespace-pre-wrap">
                {attempt.errorReason || "—"}
              </dd>
            </div>
          </dl>
        )}
        <p className="text-[10px] text-muted-foreground mt-3">
          Stored in this browser session only. Attempts from other admins or other browsers are not shown here.
        </p>
      </CardContent>
    </Card>
  );
};

export default ChatDebugPanel;
