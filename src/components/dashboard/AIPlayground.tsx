import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, Sparkles, Lightbulb, AlertTriangle } from "lucide-react";
import { streamChat } from "@/lib/streamChat";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import AIFeedback from "@/components/dashboard/AIFeedback";

type Message = { role: "user" | "assistant"; content: string };

const promptSuggestions = [
  "Explain what is Retrieval Augmented Generation (RAG)",
  "Write a prompt to summarize a research paper",
  "Compare GPT-5, Claude and Gemini models",
  "How can I use AI for my college project?",
  "Explain Chain of Thought prompting with examples",
  "What are AI Agents and how do they work?",
];

const FALLBACK_ERROR = "I'm having trouble connecting right now. Please try again in a moment. If the issue persists, check your internet connection.";

const AIPlayground = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "👋 Hi! I'm your **AI learning assistant** powered by real AI. Ask me anything about AI concepts, tools, or prompt engineering. Try the suggestions below to get started!" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const msg = text || input;
    if (!msg.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: msg };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && prev.length === updatedMessages.length + 1) {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
        onDelta: (chunk) => upsertAssistant(chunk),
        onDone: () => setIsLoading(false),
      });
    } catch (e) {
      console.error(e);
      setIsLoading(false);
      // Show friendly fallback message instead of raw error
      const errorMessage = e instanceof Error && e.message.includes("Rate limit")
        ? "⏳ Too many requests — please wait a moment and try again."
        : e instanceof Error && e.message.includes("usage limit")
        ? "💳 AI usage limit reached. Please try again later."
        : FALLBACK_ERROR;
      
      setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${errorMessage}` }]);
      toast.error("AI service temporarily unavailable", { duration: 3000 });
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden" role="region" aria-label="AI Chat Playground">
      <div className="p-4 border-b border-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-card-foreground">AI Chat Playground</h3>
          <p className="text-xs text-muted-foreground">Practice prompt engineering with real AI</p>
        </div>
      </div>

      <div ref={scrollRef} className="h-[400px] overflow-y-auto p-4 space-y-4" role="log" aria-label="Chat messages" aria-live="polite">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-gradient-accent flex items-center justify-center flex-shrink-0" aria-hidden="true">
                <Bot className="h-4 w-4 text-accent-foreground" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
              }`}
            >
              {msg.role === "assistant" ? (
                <div>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                  {/* Feedback for non-initial, non-error assistant messages */}
                  {i > 0 && !msg.content.startsWith("⚠️") && (
                    <AIFeedback messageIndex={i} />
                  )}
                </div>
              ) : (
                <span className="whitespace-pre-wrap">{msg.content}</span>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0" aria-hidden="true">
                <User className="h-4 w-4 text-secondary-foreground" />
              </div>
            )}
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-gradient-accent flex items-center justify-center flex-shrink-0" aria-hidden="true">
              <Bot className="h-4 w-4 text-accent-foreground" />
            </div>
            <div className="bg-muted rounded-lg px-4 py-3 text-sm text-muted-foreground flex items-center gap-1.5" role="status" aria-label="AI is thinking">
              <span className="flex gap-1" aria-hidden="true">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
              <span className="ml-1">AI is thinking...</span>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-2 border-t border-border flex gap-2 overflow-x-auto" role="group" aria-label="Prompt suggestions">
        <Lightbulb className="h-4 w-4 text-warning flex-shrink-0 mt-1" aria-hidden="true" />
        {promptSuggestions.map((s) => (
          <button
            key={s}
            onClick={() => handleSend(s)}
            className="text-xs px-3 py-1.5 rounded-full border border-border bg-muted/50 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors whitespace-nowrap flex-shrink-0"
            aria-label={`Ask: ${s}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="p-4 border-t border-border flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type your prompt here..."
          className="flex-1"
          aria-label="Type your message"
        />
        <Button
          onClick={() => handleSend()}
          disabled={isLoading || !input.trim()}
          className="bg-gradient-primary border-0 text-primary-foreground"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
};

export default AIPlayground;
