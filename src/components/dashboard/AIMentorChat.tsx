import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Loader2, Send, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface Msg { role: "user" | "assistant"; content: string }

const MENTOR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-mentor`;
const NEXT_MARKER = "###NEXT_ACTIONS";

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
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [actions, setActions] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-start a session when topic changes
  useEffect(() => {
    setMessages([]); setActions([]); setInput("");
    void send("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const send = async (text: string) => {
    const userText = text.trim();
    const nextMessages: Msg[] = userText
      ? [...messages, { role: "user", content: userText }]
      : messages;
    if (userText) setMessages(nextMessages);
    setInput("");
    setStreaming(true);
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
        body: JSON.stringify({
          topic,
          messages: nextMessages,
        }),
      });

      if (resp.status === 429) { toast.error("Too many requests. Please wait a moment."); setStreaming(false); return; }
      if (resp.status === 402) { toast.error("AI credits exhausted. Please add credits."); setStreaming(false); return; }
      if (!resp.ok || !resp.body) { toast.error("Mentor failed to respond"); setStreaming(false); return; }

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
      // Final flush of any leftover
      if (buf.trim()) {
        for (let raw of buf.split("\n")) {
          if (!raw.startsWith("data: ")) continue;
          const j = raw.slice(6).trim();
          if (j === "[DONE]") continue;
          try { const p = JSON.parse(j); const c = p.choices?.[0]?.delta?.content; if (c) upsert(c); } catch { /* noop */ }
        }
      }
      const { actions: parsedActions } = splitNextActions(assistantSoFar);
      setActions(parsedActions);
    } catch (e) {
      console.error(e);
      toast.error("Connection error talking to the mentor");
    } finally {
      setStreaming(false);
    }
  };

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2"><Bot className="h-5 w-5 text-primary" /> AI Mentor</span>
          <Badge variant="outline" className="text-xs gap-1"><Sparkles className="h-3 w-3" /> {topic}</Badge>
        </CardTitle>
        {onChangeTopic && <button className="text-xs text-muted-foreground hover:text-primary text-left" onClick={onChangeTopic}>Change topic</button>}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
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
