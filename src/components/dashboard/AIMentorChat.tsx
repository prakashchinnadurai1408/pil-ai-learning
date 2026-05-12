import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Loader2, Send, Sparkles, ArrowRight, RotateCcw, AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface Msg { role: "user" | "assistant"; content: string }
type StreamStatus = "idle" | "streaming" | "completed" | "failed";

const MENTOR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-mentor`;
const NEXT_MARKER = "###NEXT_ACTIONS";
const MAX_PERSISTED = 50;
const STORAGE_KEY = (sid: string | null, topic: string) => `aiMentor:conversation:${sid || "guest"}:${topic}`;

function splitNextActions(text: string): { body: string; actions: string[] } {
  const idx = text.indexOf(NEXT_MARKER);
  if (idx === -1) return { body: text, actions: [] };
  const body = text.slice(0, idx).trim();
  const tail = text.slice(idx + NEXT_MARKER.length).trim();
  const actions = tail.split(/\r?\n/).map((l) => l.replace(/^[-*]\s*/, "").trim()).filter(Boolean);
  return { body, actions };
}

interface Props { topic: string; onChangeTopic?: () => void }

const AIMentorChat = ({ topic, onChangeTopic }: Props) => {
  const studentId = typeof window !== "undefined" ? sessionStorage.getItem("studentId") : null;
  const storageKey = useMemo(() => STORAGE_KEY(studentId, topic), [studentId, topic]);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [actions, setActions] = useState<string[]>([]);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>("idle");
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const didHydrateRef = useRef(false);

  // Hydrate / start session when topic changes
  useEffect(() => {
    didHydrateRef.current = false;
    let restored: Msg[] = [];
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) restored = parsed as Msg[];
      }
    } catch { /* ignore */ }
    setActions([]); setInput(""); setLastError(null); setLastFailedPrompt(null);
    setStreamStatus(restored.length ? "completed" : "idle");
    setMessages(restored);
    didHydrateRef.current = true;
    if (restored.length === 0) void send("", []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, storageKey]);

  // Persist
  useEffect(() => {
    if (!didHydrateRef.current) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages.slice(-MAX_PERSISTED)));
    } catch { /* ignore */ }
  }, [messages, storageKey]);

  // Auto-scroll to latest (rAF ensures it runs after layout)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }, [messages, streaming]);

  const send = async (text: string, baseMessages?: Msg[]) => {
    const userText = text.trim();
    const source = baseMessages ?? messages;
    const nextMessages: Msg[] = userText
      ? [...source, { role: "user", content: userText }]
      : source;
    if (userText) setMessages(nextMessages);
    setInput("");
    setStreaming(true);
    setStreamStatus("streaming");
    setLastError(null);
    setLastFailedPrompt(null);
    setActions([]);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: splitNextActions(assistantSoFar).body || m.content } : m));
        return [...prev, { role: "assistant", content: splitNextActions(assistantSoFar).body }];
      });
    };

    try {
      const resp = await fetch(MENTOR_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ topic, messages: nextMessages }),
      });

      if (resp.status === 429) {
        toast.error("Too many requests. Please wait a moment.");
        setLastError("⏳ Too many requests — please wait and try again.");
        if (userText) setLastFailedPrompt(userText);
        setStreaming(false); setStreamStatus("failed");
        if (userText) setMessages((prev) => (prev[prev.length - 1]?.role === "user" && prev[prev.length - 1].content === userText ? prev.slice(0, -1) : prev));
        return;
      }
      if (resp.status === 402) {
        toast.error("AI credits exhausted. Please add credits.");
        setLastError("💳 AI usage limit reached. Please try again later.");
        if (userText) setLastFailedPrompt(userText);
        setStreaming(false); setStreamStatus("failed");
        if (userText) setMessages((prev) => (prev[prev.length - 1]?.role === "user" && prev[prev.length - 1].content === userText ? prev.slice(0, -1) : prev));
        return;
      }
      if (!resp.ok || !resp.body) {
        toast.error("Mentor failed to respond");
        setLastError("Mentor failed to respond. Please retry.");
        if (userText) setLastFailedPrompt(userText);
        setStreaming(false); setStreamStatus("failed");
        if (userText) setMessages((prev) => (prev[prev.length - 1]?.role === "user" && prev[prev.length - 1].content === userText ? prev.slice(0, -1) : prev));
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = ""; let done = false;
      while (!done) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl); buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsert(content);
          } catch { buf = line + "\n" + buf; break; }
        }
      }
      if (buf.trim()) {
        for (const raw of buf.split("\n")) {
          if (!raw.startsWith("data: ")) continue;
          const j = raw.slice(6).trim();
          if (j === "[DONE]") continue;
          try { const p = JSON.parse(j); const c = p.choices?.[0]?.delta?.content; if (c) upsert(c); } catch { /* noop */ }
        }
      }
      const { actions: parsedActions } = splitNextActions(assistantSoFar);
      setActions(parsedActions);
      setStreamStatus("completed");
    } catch (e) {
      console.error(e);
      toast.error("Connection error talking to the mentor");
      setLastError("Connection error talking to the mentor.");
      if (userText) setLastFailedPrompt(userText);
      setStreamStatus("failed");
      if (userText) setMessages((prev) => (prev[prev.length - 1]?.role === "user" && prev[prev.length - 1].content === userText ? prev.slice(0, -1) : prev));
    } finally {
      setStreaming(false);
    }
  };

  const retryLast = () => {
    if (!lastFailedPrompt || streaming) return;
    void send(lastFailedPrompt);
  };

  const clearConversation = () => {
    setMessages([]); setActions([]); setLastError(null); setLastFailedPrompt(null); setStreamStatus("idle");
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
    toast.success("Conversation cleared");
    void send("", []);
  };

  const statusBadge = streamStatus === "idle" ? null : (
    <span
      className={
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border " +
        (streamStatus === "streaming"
          ? "bg-primary/10 text-primary border-primary/30"
          : streamStatus === "completed"
          ? "bg-success/10 text-success border-success/30"
          : "bg-destructive/10 text-destructive border-destructive/30")
      }
      role="status"
      aria-live="polite"
    >
      {streamStatus === "streaming" && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" aria-hidden="true" />}
      {streamStatus === "streaming" ? "Streaming…" : streamStatus === "completed" ? "Completed" : "Failed"}
    </span>
  );

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 min-w-0">
            <Bot className="h-5 w-5 text-primary flex-shrink-0" />
            <span className="truncate">AI Mentor</span>
            {statusBadge}
          </span>
          <span className="flex items-center gap-2 flex-shrink-0">
            <Badge variant="outline" className="text-xs gap-1"><Sparkles className="h-3 w-3" /> {topic}</Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearConversation}
              disabled={streaming}
              aria-label="Clear conversation"
              title="Clear conversation"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </span>
        </CardTitle>
        {onChangeTopic && <button className="text-xs text-muted-foreground hover:text-primary text-left" onClick={onChangeTopic}>Change topic</button>}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
        {lastError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 flex items-start gap-3" role="alert">
            <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-destructive">Response failed</p>
              <p className="text-xs text-destructive/80 mt-0.5 break-words">{lastError}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={retryLast}
              disabled={streaming || !lastFailedPrompt}
              className="flex-shrink-0 gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Retry
            </Button>
          </div>
        )}

        <ScrollArea className="flex-1 -mx-2 px-2">
          <div ref={scrollRef} className="space-y-3 pr-2">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
              </div>
            ))}
            {streaming && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex justify-start"><div className="bg-muted rounded-lg px-3 py-2 text-sm flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Thinking…</div></div>
            )}
          </div>
        </ScrollArea>

        {actions.length > 0 && !streaming && (
          <div className="border-t border-border pt-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Suggested next actions</p>
            <div className="flex flex-wrap gap-2">
              {actions.map((a, i) => (
                <Button key={i} variant="outline" size="sm" className="gap-1.5 h-auto py-1.5 text-xs whitespace-normal text-left" onClick={() => send(a)}>
                  <ArrowRight className="h-3 w-3 shrink-0" /> {a}
                </Button>
              ))}
            </div>
          </div>
        )}

        <form
          className="flex gap-2 border-t border-border pt-3"
          onSubmit={(e) => { e.preventDefault(); if (!streaming && input.trim()) send(input); }}
        >
          <Input placeholder="Type your answer or question…" value={input} onChange={(e) => setInput(e.target.value)} disabled={streaming} />
          <Button type="submit" disabled={streaming || !input.trim()} className="gap-1.5">
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AIMentorChat;
