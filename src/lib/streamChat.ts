import { recordChatAttempt } from "./aiChatDebug";

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type Msg = { role: "user" | "assistant"; content: string | ContentPart[] };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

export async function streamChat({
  messages,
  tool,
  studentContext,
  modelOverride,
  userMeta,
  featureTag,
  onDelta,
  onDone,
  onFallback,
}: {
  messages: Msg[];
  tool?: string;
  studentContext?: Record<string, any>;
  modelOverride?: string;
  userMeta?: { id?: string; name?: string; role?: string };
  featureTag?: string;
  onDelta: (deltaText: string) => void;
  onDone: () => void;
  onFallback?: (info: { status: number; reason: string }) => void;
}) {
  // Auto-resolve userMeta from sessionStorage if not provided.
  let resolvedMeta = userMeta;
  if (!resolvedMeta) {
    try {
      const raw = sessionStorage.getItem("studentSession") || sessionStorage.getItem("trainerSession") || sessionStorage.getItem("adminSession");
      if (raw) {
        const s = JSON.parse(raw);
        const role = sessionStorage.getItem("studentSession") ? "student" : sessionStorage.getItem("trainerSession") ? "trainer" : "admin";
        resolvedMeta = { id: s.id || s.email || "", name: s.name || "", role };
      }
    } catch { /* ignore */ }
  }

  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, tool, studentContext, modelOverride, userMeta: resolvedMeta, featureTag }),
  });

  if (!resp.ok || !resp.body) {
    const errorData = await resp.json().catch(() => ({ error: "Failed to connect to AI" }));
    throw new Error(errorData.error || "Failed to start stream");
  }

  // Detect non-stream JSON fallback response (sent by edge fn when upstream returns 402/429/5xx).
  const contentType = resp.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await resp.json().catch(() => ({}));
    if (data?.fallback) {
      onFallback?.({ status: data.status || 0, reason: data.error || "AI unavailable" });
      onDone();
      return;
    }
    if (data?.error) throw new Error(data.error);
    onDone();
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") {
        streamDone = true;
        break;
      }

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }

  if (textBuffer.trim()) {
    for (let raw of textBuffer.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (raw.startsWith(":") || raw.trim() === "") continue;
      if (!raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch { /* ignore */ }
    }
  }

  onDone();
}
