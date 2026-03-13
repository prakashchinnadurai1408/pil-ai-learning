import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FlaskConical, FileText, Code, Brain, HelpCircle, Loader2, Copy, CheckCircle, AlertTriangle, Sparkles } from "lucide-react";
import { streamChat } from "@/lib/streamChat";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import AIFeedback from "@/components/dashboard/AIFeedback";
import { usePublishedSectionContent } from "@/hooks/useAdminSectionContent";

const tools = [
  {
    id: "summarize",
    title: "Text Summarizer",
    description: "Paste any text, article, or research paper and get a concise summary with key points.",
    icon: FileText,
    placeholder: "Paste the text you want to summarize here...",
    buttonText: "Summarize",
    color: "from-primary to-blue-600",
  },
  {
    id: "code",
    title: "Code Generator",
    description: "Describe what you want to build and get clean, commented code in your preferred language.",
    icon: Code,
    placeholder: "Describe the code you need (e.g., 'Python function to sort a list using merge sort')...",
    buttonText: "Generate Code",
    color: "from-green-500 to-teal-500",
  },
  {
    id: "explain",
    title: "AI Concept Explainer",
    description: "Enter any AI/ML concept and get a simple, easy-to-understand explanation with examples.",
    icon: Brain,
    placeholder: "Enter an AI concept (e.g., 'Transformer architecture', 'Backpropagation')...",
    buttonText: "Explain",
    color: "from-accent to-primary",
  },
  {
    id: "quiz",
    title: "Quiz Generator",
    description: "Enter a topic and get 5 MCQ questions with answers — great for self-assessment.",
    icon: HelpCircle,
    placeholder: "Enter a topic (e.g., 'Neural Networks', 'Prompt Engineering basics')...",
    buttonText: "Generate Quiz",
    color: "from-orange-500 to-yellow-500",
  },
];

const AIToolsSandbox = () => {
  const { items: adminTools } = usePublishedSectionContent("tools");
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentTool = tools.find((t) => t.id === selectedTool);

  const handleRun = async () => {
    if (!input.trim() || !selectedTool) return;
    setOutput("");
    setIsLoading(true);

    let resultSoFar = "";
    try {
      await streamChat({
        messages: [{ role: "user", content: input }],
        tool: selectedTool,
        onDelta: (chunk) => {
          resultSoFar += chunk;
          setOutput(resultSoFar);
        },
        onDone: () => setIsLoading(false),
      });
    } catch (e) {
      setIsLoading(false);
      const msg = e instanceof Error && e.message.includes("Rate limit")
        ? "Too many requests — please wait and try again."
        : "AI service is temporarily unavailable. Please try again in a moment.";
      setOutput(`⚠️ ${msg}`);
      toast.error(msg, { duration: 3000 });
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!selectedTool) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-2">
          <h3 className="font-display font-semibold text-lg text-foreground">AI Tools Sandbox</h3>
          <p className="text-sm text-muted-foreground">Select a tool to experiment with real AI capabilities</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => setSelectedTool(tool.id)}
                className="bg-card rounded-lg border border-border p-6 shadow-card hover:shadow-elevated transition-all text-left hover:-translate-y-1"
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${tool.color} flex items-center justify-center mb-4`}>
                  <Icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h4 className="font-display font-semibold text-card-foreground mb-1">{tool.title}</h4>
                <p className="text-sm text-muted-foreground">{tool.description}</p>
              </button>
            );
          })}
        </div>
        {adminTools.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-accent" />
              <h4 className="font-display font-semibold text-foreground">Additional AI Exercises</h4>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {adminTools.map(item => (
                <div key={item.id} className="bg-card rounded-lg border border-accent/20 p-4 shadow-card">
                  <h5 className="font-medium text-sm text-card-foreground mb-1">{item.title}</h5>
                  <p className="text-xs text-muted-foreground mb-2">{item.content?.description || ""}</p>
                  {item.content?.toolType && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{item.content.toolType}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const Icon = currentTool!.icon;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${currentTool!.color} flex items-center justify-center`}>
            <Icon className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">{currentTool!.title}</h3>
            <p className="text-xs text-muted-foreground">{currentTool!.description}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => { setSelectedTool(null); setInput(""); setOutput(""); }}>
          ← All Tools
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground">Input</label>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={currentTool!.placeholder}
            className="min-h-[250px] resize-none"
          />
          <Button
            onClick={handleRun}
            disabled={isLoading || !input.trim()}
            className="w-full bg-gradient-primary border-0 text-primary-foreground gap-2"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
            {isLoading ? "Processing..." : currentTool!.buttonText}
          </Button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-foreground">Output</label>
            {output && (
              <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1 text-xs">
                {copied ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            )}
          </div>
          <div className="min-h-[250px] bg-muted/50 rounded-lg border border-border p-4 overflow-y-auto" role="region" aria-label="AI output" aria-live="polite">
            {output ? (
              <div>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{output}</ReactMarkdown>
                </div>
                {!output.startsWith("⚠️") && !isLoading && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <AIFeedback messageIndex={0} />
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                {isLoading ? "Generating response..." : "Output will appear here..."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIToolsSandbox;
