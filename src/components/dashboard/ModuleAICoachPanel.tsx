import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Brain, Sparkles, Loader2, Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Props {
  studentId: string | null;
  studentName: string;
  moduleId: number;
  moduleTitle: string;
}

interface Msg { role: "user" | "assistant"; content: string }

const ModuleAICoachPanel = ({ studentId, studentName, moduleId, moduleTitle }: Props) => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [tip, setTip] = useState<string>("");
  const [loadingTip, setLoadingTip] = useState(true);

  useEffect(() => {
    setMessages([]);
    setTip("");
    if (!studentId) { setLoadingTip(false); return; }
    (async () => {
      setLoadingTip(true);
      const { data: progress } = await supabase
        .from("student_module_progress")
        .select("progress_percent, completed")
        .eq("student_id", studentId)
        .eq("module_id", moduleId)
        .maybeSingle();
      const { data: scores } = await supabase
        .from("student_assessment_scores")
        .select("score")
        .eq("student_id", studentId)
        .eq("module_id", moduleId);
      const avgScore = scores && scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + (b.score || 0), 0) / scores.length)
        : null;
      const p = progress?.progress_percent || 0;
      let advice = "";
      if (p === 0) advice = `Welcome! Start by reading the first lesson, then watch the videos. The Module Quiz at the end checks your understanding (70% to pass).`;
      else if (p < 50) advice = `You're ${p}% through. Keep momentum — finish the next 1-2 lessons today, then try a video.`;
      else if (p < 100) advice = `Almost there (${p}%). Finish remaining lessons, rewatch any video that felt unclear, then take the Module Quiz.`;
      else if (avgScore !== null && avgScore < 70) advice = `Module complete but quiz score is ${avgScore}%. Review weak topics and retake — aim for 70%+.`;
      else advice = `Excellent! Module mastered. Try the related coding challenges or move to the next module in your path.`;
      setTip(advice);
      setLoadingTip(false);
    })();
  }, [studentId, moduleId]);

  const send = async () => {
    if (!input.trim() || sending) return;
    const userMsg = input.trim();
    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    setInput("");
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("chat", {
        body: {
          messages: [
            { role: "system", content: `You are an AI Coach helping ${studentName} learn the module "${moduleTitle}". Be concise, friendly, and module-focused. Keep replies under 120 words.` },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: userMsg },
          ],
        },
      });
      if (error) throw error;
      const reply = data?.choices?.[0]?.message?.content || data?.text || "Sorry, I couldn't generate a response.";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e: any) {
      toast.error("Coach unavailable right now");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b border-border bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Brain className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-sm text-card-foreground">AI Coach</h3>
            <p className="text-[10px] text-muted-foreground">For this module</p>
          </div>
        </div>
      </div>

      <div className="p-3 border-b border-border bg-muted/30">
        <div className="flex items-start gap-2">
          <Sparkles className="h-3.5 w-3.5 text-warning mt-0.5 flex-shrink-0" />
          <div className="text-xs text-card-foreground">
            {loadingTip ? <Loader2 className="h-3 w-3 animate-spin" /> : tip}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px] max-h-[320px]">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">Ask anything about this module 👇</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`text-xs p-2 rounded-lg ${m.role === "user" ? "bg-primary/10 ml-4" : "bg-muted mr-4"}`}>
            <p className="font-semibold mb-0.5 text-[10px] uppercase opacity-70">{m.role === "user" ? "You" : "Coach"}</p>
            <div className="text-card-foreground whitespace-pre-wrap">{m.content}</div>
          </div>
        ))}
        {sending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground mx-auto" />}
      </div>

      <div className="p-3 border-t border-border space-y-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask the coach..."
          rows={2}
          className="text-xs resize-none"
        />
        <Button size="sm" onClick={send} disabled={!input.trim() || sending} className="w-full gap-1.5 h-8 text-xs">
          <Send className="h-3 w-3" /> Send
        </Button>
      </div>
    </div>
  );
};

export default ModuleAICoachPanel;
