import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Sparkles, Lightbulb } from "lucide-react";
import { streamChat } from "@/lib/streamChat";
import { toast } from "sonner";
import { usePublishedSectionContent } from "@/hooks/useAdminSectionContent";
import { modules } from "@/data/modules";
import ChatMessage from "./chat/ChatMessage";
import ChatLanguageSelector, { LANGUAGES, type LanguageCode } from "./chat/ChatLanguageSelector";
import ChatVoiceInput from "./chat/ChatVoiceInput";

type Message = { role: "user" | "assistant"; content: string };

const defaultSuggestions = [
  "Explain what is Retrieval Augmented Generation (RAG)",
  "Write a prompt to summarize a research paper",
  "Compare GPT-5, Claude and Gemini models",
  "How can I use AI for my college project?",
  "Explain Chain of Thought prompting with examples",
  "What are AI Agents and how do they work?",
];

const FALLBACK_ERROR = "I'm having trouble connecting right now. Please try again in a moment.";
const EMPTY_RESPONSE_MSG = "I wasn't able to generate a response for that. Could you try rephrasing your question?";

const AIPlayground = () => {
  const { items: adminChatItems } = usePublishedSectionContent("ai_chat");
  const promptSuggestions = [
    ...defaultSuggestions,
    ...adminChatItems.map(item => item.content?.prompt).filter(Boolean),
  ];
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "👋 Hi! I'm **Aira**, your AI learning assistant. Ask me anything about AI concepts, tools, or prompt engineering — in English or any Indian language! Try the suggestions below to get started." },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lang, setLang] = useState<LanguageCode>("en-IN");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [studentCtx, setStudentCtx] = useState<Record<string, any> | undefined>(undefined);

  // Fetch student learning context for adaptive AI
  useEffect(() => {
    const fetchContext = async () => {
      const studentId = sessionStorage.getItem("studentId");
      const studentName = sessionStorage.getItem("studentName");
      if (!studentId) return;

      const [{ data: modProgress }, { data: quizScores }, { data: assessScores }, { data: codingSolved }] = await Promise.all([
        supabase.from("student_module_progress").select("module_id, progress_percent, completed").eq("student_id", studentId),
        supabase.from("student_assessment_scores").select("module_id, score").eq("student_id", studentId),
        supabase.from("assessment_attempts").select("score").eq("student_id", studentId),
        supabase.from("student_solved_challenges").select("id").eq("student_name", studentName || ""),
      ]);

      const completed = (modProgress || []).filter((m: any) => m.completed).length;
      const avgQuiz = quizScores && quizScores.length > 0
        ? Math.round(quizScores.reduce((a: number, b: any) => a + b.score, 0) / quizScores.length)
        : 0;
      const avgAssess = assessScores && assessScores.length > 0
        ? Math.round(assessScores.reduce((a: number, b: any) => a + b.score, 0) / assessScores.length)
        : 0;

      // Identify weak modules (quiz score < 60)
      const weakModules = (quizScores || [])
        .filter((q: any) => q.score < 60)
        .map((q: any) => modules.find(m => m.id === q.module_id)?.title)
        .filter(Boolean);

      setStudentCtx({
        completedModules: completed,
        totalModules: modules.length,
        avgQuizScore: avgQuiz,
        assessmentCount: assessScores?.length || 0,
        avgAssessmentScore: avgAssess,
        codingSolved: codingSolved?.length || 0,
        weakAreas: weakModules.length > 0 ? weakModules.join(", ") : "Not yet determined",
      });
    };
    fetchContext();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async (text?: string) => {
    const msg = text || input;
    if (!msg.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: msg.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    const selectedLang = LANGUAGES.find(l => l.code === lang);

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
        messages: updatedMessages
          .filter((_, i) => i > 0 || updatedMessages[0].role === "user")
          .map(m => ({ role: m.role, content: m.content })),
        tool: lang !== "en-IN" ? `lang:${selectedLang?.aiLabel}` : undefined,
        studentContext: studentCtx,
        onDelta: (chunk) => upsertAssistant(chunk),
        onDone: () => {
          setIsLoading(false);
          if (!assistantSoFar.trim()) {
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant" && !last.content.trim()) {
                return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: EMPTY_RESPONSE_MSG } : m));
              }
              return [...prev, { role: "assistant", content: EMPTY_RESPONSE_MSG }];
            });
          }
        },
      });
    } catch (e) {
      console.error(e);
      setIsLoading(false);
      const errorMessage = e instanceof Error && e.message.includes("Rate limit")
        ? "⏳ Too many requests — please wait a moment and try again."
        : e instanceof Error && e.message.includes("usage limit")
        ? "💳 AI usage limit reached. Please try again later."
        : FALLBACK_ERROR;
      setMessages(prev => [...prev, { role: "assistant", content: `⚠️ ${errorMessage}` }]);
      toast.error("AI service temporarily unavailable", { duration: 3000 });
    }
  }, [input, isLoading, messages, lang]);

  return (
    <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden" role="region" aria-label="AI Chat Playground">
      <div className="p-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-card-foreground">Aira — AI Chat</h3>
            <p className="text-xs text-muted-foreground">Multilingual AI assistant with voice — remembers your conversation</p>
          </div>
        </div>
        <ChatLanguageSelector value={lang} onChange={setLang} />
      </div>

      <div ref={scrollRef} className="h-[400px] overflow-y-auto p-4 space-y-4" role="log" aria-label="Chat messages" aria-live="polite">
        {messages.map((msg, i) => (
          <ChatMessage key={i} msg={msg} index={i} lang={lang} />
        ))}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-accent flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-4 w-4 text-accent-foreground" />
            </div>
            <div className="bg-muted rounded-lg px-4 py-3 text-sm text-muted-foreground flex items-center gap-1.5" role="status" aria-label="AI is thinking">
              <span className="flex gap-1" aria-hidden="true">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
              <span className="ml-1">Aira is thinking...</span>
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
          placeholder="Type or speak your question..."
          className="flex-1"
          aria-label="Type your message"
        />
        <ChatVoiceInput
          lang={lang}
          onTranscript={(text) => { setInput(text); }}
          disabled={isLoading}
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
