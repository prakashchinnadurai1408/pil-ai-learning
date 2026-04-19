import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  FlaskConical, FileText, Code, Brain, Loader2, Copy, CheckCircle, Sparkles,
  Type, Image as ImageIcon, BarChart3, Search, Bug, Languages, SpellCheck, MessageCircle,
  Eye, ScanText, FileQuestion, Mic, Database, Upload, X, Download, GitCompare,
} from "lucide-react";
import { streamChat } from "@/lib/streamChat";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import AIFeedback from "@/components/dashboard/AIFeedback";
import { usePublishedSectionContent } from "@/hooks/useAdminSectionContent";
import { extractPdfText, parseCsvFile, fileToDataUrl } from "@/lib/sandboxFiles";

type Category = "Generation" | "Analysis" | "Code" | "Language" | "Vision" | "Multimodal";
type ToolKind = "text" | "image-gen" | "image-input" | "paste-context" | "pdf-input" | "audio-input" | "csv-input";

interface Tool {
  id: string;
  category: Category;
  title: string;
  description: string;
  icon: typeof FileText;
  placeholder: string;
  buttonText: string;
  color: string;
  kind: ToolKind;
  samples: string[];
  contextLabel?: string;
}

const TOOLS: Tool[] = [
  // Generation
  { id: "text-gen", category: "Generation", title: "Text Generation", description: "Create essays, stories, emails, blogs, and marketing copy from a short prompt.",
    icon: Type, placeholder: "Describe what you want to write...", buttonText: "Generate", color: "from-primary to-blue-600", kind: "text",
    samples: ["Write a product description for a smartwatch", "Write a short story about a robot", "Draft a formal email to a client"] },
  { id: "image-gen", category: "Generation", title: "Image Generation", description: "Turn text descriptions into AI-generated visuals — illustrations, photos, icons.",
    icon: ImageIcon, placeholder: "Describe the image you want...", buttonText: "Generate Image", color: "from-fuchsia-500 to-pink-500", kind: "image-gen",
    samples: ["A cozy café in the rain, watercolor style", "Futuristic city at dusk, cinematic", "Minimalist logo for an AI startup"] },

  // Analysis
  { id: "summarize", category: "Analysis", title: "Text Summarization", description: "Condense long articles, reports, or books into key points in seconds.",
    icon: FileText, placeholder: "Paste the text you want to summarize...", buttonText: "Summarize", color: "from-primary to-blue-600", kind: "text",
    samples: ["Summarize this 1000-word article in 5 bullets", "TL;DR of this research paper"] },
  { id: "sentiment", category: "Analysis", title: "Sentiment Analysis", description: "Detect positive, negative, or neutral tone in reviews, tweets, or feedback.",
    icon: BarChart3, placeholder: "Paste a review, tweet or feedback...", buttonText: "Analyze", color: "from-amber-500 to-orange-500", kind: "text",
    samples: ["Is this review positive or negative?", "Analyze the tone of this paragraph"] },
  { id: "extract", category: "Analysis", title: "Data Extraction", description: "Pull structured info (names, dates, prices) from unstructured text.",
    icon: Search, placeholder: "Paste unstructured text...", buttonText: "Extract", color: "from-teal-500 to-cyan-500", kind: "text",
    samples: ["Extract all dates from this email", "List all product names mentioned"] },

  // Code
  { id: "code", category: "Code", title: "Code Generation", description: "Write functions, scripts, or full programs from plain-English instructions.",
    icon: Code, placeholder: "Describe the code you need...", buttonText: "Generate Code", color: "from-green-500 to-teal-500", kind: "text",
    samples: ["Write a Python function to sort a list", "Create a REST API in Node.js"] },
  { id: "explain-code", category: "Code", title: "Code Explanation", description: "Get a clear explanation of what any code snippet does — line by line.",
    icon: Brain, placeholder: "Paste the code to explain...", buttonText: "Explain Code", color: "from-emerald-500 to-green-600", kind: "text",
    samples: ["Explain this SQL query to me", "What does this Python decorator do?"] },
  { id: "debug", category: "Code", title: "Bug Detection & Fixing", description: "Paste broken code and let AI spot the error, explain it, and fix it.",
    icon: Bug, placeholder: "Paste broken code...", buttonText: "Debug", color: "from-red-500 to-rose-500", kind: "text",
    samples: ["Why isn't this loop working?", "Debug this JavaScript function"] },

  // Language
  { id: "translate", category: "Language", title: "Translation", description: "Translate text between 100+ languages — with context-aware accuracy.",
    icon: Languages, placeholder: "Paste text + target language (e.g. 'Translate to French: ...')", buttonText: "Translate", color: "from-indigo-500 to-violet-500", kind: "text",
    samples: ["Translate this to French: Good morning", "Translate this email to Hindi formally: Dear sir, ..."] },
  { id: "grammar", category: "Language", title: "Grammar & Style Check", description: "Fix spelling, grammar, and improve writing clarity and tone.",
    icon: SpellCheck, placeholder: "Paste text to proofread...", buttonText: "Check & Fix", color: "from-sky-500 to-blue-500", kind: "text",
    samples: ["Fix grammar in this paragraph: ...", "Make this sound more professional: ..."] },
  { id: "qa", category: "Language", title: "Q&A / Chatbot", description: "Ask questions in natural language and get precise, conversational answers.",
    icon: MessageCircle, placeholder: "Ask anything...", buttonText: "Ask", color: "from-accent to-primary", kind: "text",
    samples: ["What is photosynthesis?", "Explain blockchain like I'm 10"] },

  // Vision
  { id: "vision", category: "Vision", title: "Image Understanding", description: "Upload an image and ask AI to describe, label, or answer questions about it.",
    icon: Eye, placeholder: "Optional: ask a specific question about the image...", buttonText: "Analyze Image", color: "from-purple-500 to-fuchsia-500", kind: "image-input",
    samples: ["What objects are in this photo?", "Describe this chart to me"] },
  { id: "ocr", category: "Vision", title: "OCR (Text Extraction)", description: "Extract printed or handwritten text from photos, scans, or screenshots.",
    icon: ScanText, placeholder: "Optional instructions...", buttonText: "Extract Text", color: "from-violet-500 to-purple-500", kind: "image-input",
    samples: ["Read the text in this receipt photo", "Extract text from this screenshot"] },

  // Multimodal — now with REAL file uploads
  { id: "doc-qa", category: "Multimodal", title: "Document Q&A (PDF)", description: "Upload a PDF and ask questions — AI answers from the document text.",
    icon: FileQuestion, placeholder: "Your question about the document...", buttonText: "Ask Document", color: "from-orange-500 to-amber-500", kind: "pdf-input",
    contextLabel: "Upload a PDF (or paste text)", samples: ["What are the key findings in this report?", "Summarize chapter 3", "List the main recommendations"] },
  { id: "transcribe", category: "Multimodal", title: "Speech-to-Text", description: "Upload an audio file (or paste a rough transcript) and get a clean transcription.",
    icon: Mic, placeholder: "Optional: cleanup or formatting instructions...", buttonText: "Transcribe", color: "from-pink-500 to-rose-500", kind: "audio-input",
    contextLabel: "Upload an audio file (or paste transcript)", samples: ["Transcribe this voice note", "Turn this audio into meeting notes", "Add speaker labels"] },
  { id: "data-analysis", category: "Multimodal", title: "Data Analysis (CSV)", description: "Upload a CSV file — AI finds trends, totals, and explains insights.",
    icon: Database, placeholder: "Optional: analysis question...", buttonText: "Analyze Data", color: "from-cyan-500 to-blue-500", kind: "csv-input",
    contextLabel: "Upload a CSV file (or paste table)", samples: ["What trend do you see?", "Top 5 rows by value", "Suggest a chart for this data"] },
];

const CATEGORIES: ("All" | Category)[] = ["All", "Generation", "Analysis", "Code", "Language", "Vision", "Multimodal"];

const COMPARE_MODELS = {
  a: { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  b: { id: "openai/gpt-5-mini", label: "GPT-5 Mini" },
};

const AIToolsSandbox = () => {
  const { items: adminTools } = usePublishedSectionContent("tools");
  const [activeCategory, setActiveCategory] = useState<"All" | Category>("All");
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [contextText, setContextText] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>("");
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null);
  const [audioName, setAudioName] = useState<string>("");
  const [fileName, setFileName] = useState<string>(""); // for PDF / CSV display
  const [output, setOutput] = useState("");
  const [outputA, setOutputA] = useState("");
  const [outputB, setOutputB] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingA, setIsLoadingA] = useState(false);
  const [isLoadingB, setIsLoadingB] = useState(false);
  const [copied, setCopied] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [parsing, setParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentTool = TOOLS.find((t) => t.id === selectedTool);
  const filteredTools = useMemo(
    () => activeCategory === "All" ? TOOLS : TOOLS.filter(t => t.category === activeCategory),
    [activeCategory]
  );

  const resetState = () => {
    setInput(""); setContextText(""); setImageDataUrl(null); setImageName("");
    setAudioDataUrl(null); setAudioName(""); setFileName("");
    setOutput(""); setOutputA(""); setOutputB(""); setGeneratedImage(null);
  };

  const handlePickTool = (id: string) => {
    setSelectedTool(id);
    resetState();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting same file
    if (!file || !currentTool) return;

    try {
      if (currentTool.kind === "image-input") {
        if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
        if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5 MB"); return; }
        const dataUrl = await fileToDataUrl(file);
        setImageDataUrl(dataUrl); setImageName(file.name);
      } else if (currentTool.kind === "pdf-input") {
        if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
          toast.error("Please upload a PDF file"); return;
        }
        if (file.size > 20 * 1024 * 1024) { toast.error("PDF must be under 20 MB"); return; }
        setParsing(true);
        const text = await extractPdfText(file);
        setContextText(text);
        setFileName(file.name);
        toast.success(`Extracted ${text.length.toLocaleString()} characters from PDF`);
      } else if (currentTool.kind === "audio-input") {
        if (!file.type.startsWith("audio/")) { toast.error("Please upload an audio file (mp3, wav, m4a...)"); return; }
        if (file.size > 25 * 1024 * 1024) { toast.error("Audio must be under 25 MB"); return; }
        const dataUrl = await fileToDataUrl(file);
        setAudioDataUrl(dataUrl); setAudioName(file.name);
      } else if (currentTool.kind === "csv-input") {
        if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
          toast.error("Please upload a .csv file"); return;
        }
        if (file.size > 10 * 1024 * 1024) { toast.error("CSV must be under 10 MB"); return; }
        setParsing(true);
        const summary = await parseCsvFile(file);
        setContextText(summary.preview);
        setFileName(file.name);
        toast.success(`Parsed ${summary.rowCount} rows × ${summary.columnCount} columns`);
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to process file");
    } finally {
      setParsing(false);
    }
  };

  const buildUserContent = (): { content: any; tool: string } | null => {
    if (!currentTool) return null;
    if (currentTool.kind === "image-input") {
      if (!imageDataUrl) { toast.error("Please upload an image first"); return null; }
      return {
        tool: currentTool.id,
        content: [
          { type: "text", text: input.trim() || "Analyze this image as instructed by the system prompt." },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      };
    }
    if (currentTool.kind === "pdf-input" || currentTool.kind === "csv-input" || currentTool.kind === "paste-context") {
      if (!contextText.trim()) {
        toast.error(`Please upload a file or paste content first`);
        return null;
      }
      const q = input.trim() || "Please process the content below per the system instructions.";
      return { tool: currentTool.id, content: `${q}\n\n--- CONTENT ---\n${contextText}` };
    }
    // text + audio handled outside
    if (!input.trim()) return null;
    return { tool: currentTool.id, content: input };
  };

  const runStream = async (modelOverride: string, setter: (s: string) => void, doneSetter: (b: boolean) => void) => {
    const built = buildUserContent();
    if (!built) return;
    let acc = "";
    try {
      // Prefix tool feature with "tool_" so usage analytics can group it.
      const featureTag = `tool_${built.tool}`;
      await streamChat({
        messages: [{ role: "user", content: built.content }],
        tool: featureTag,
        modelOverride,
        onDelta: (chunk) => { acc += chunk; setter(acc); },
        onDone: () => doneSetter(false),
      });
    } catch (e) {
      doneSetter(false);
      const msg = e instanceof Error ? e.message : "AI service unavailable";
      setter(`⚠️ ${msg}`);
      toast.error(msg);
    }
  };

  const handleRun = async () => {
    if (!currentTool) return;
    setOutput(""); setOutputA(""); setOutputB(""); setGeneratedImage(null);

    // Image generation — single-model only
    if (currentTool.kind === "image-gen") {
      if (!input.trim()) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("generate-image", { body: { prompt: input } });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        if (!data?.imageUrl) throw new Error("No image returned");
        setGeneratedImage(data.imageUrl);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Image generation failed";
        toast.error(msg); setOutput(`⚠️ ${msg}`);
      } finally { setIsLoading(false); }
      return;
    }

    // Audio transcription — uses dedicated edge function
    if (currentTool.kind === "audio-input") {
      if (!audioDataUrl) { toast.error("Please upload an audio file first"); return; }
      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("transcribe-audio", {
          body: { audioDataUrl, instructions: input.trim() },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setOutput(data?.text || "(no transcription returned)");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Transcription failed";
        toast.error(msg); setOutput(`⚠️ ${msg}`);
      } finally { setIsLoading(false); }
      return;
    }

    // Compare mode: run both models in parallel
    if (compareMode) {
      setIsLoadingA(true); setIsLoadingB(true);
      await Promise.all([
        runStream(COMPARE_MODELS.a.id, setOutputA, setIsLoadingA),
        runStream(COMPARE_MODELS.b.id, setOutputB, setIsLoadingB),
      ]);
      return;
    }

    // Single-model streaming run
    setIsLoading(true);
    await runStream("", setOutput, setIsLoading); // empty override = use default
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  // ============ CATALOG VIEW ============
  if (!selectedTool) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-2">
          <h3 className="font-display font-semibold text-lg text-foreground">AI Tools Sandbox</h3>
          <p className="text-sm text-muted-foreground">16 hands-on tools across 6 categories — click any tool to try it</p>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              {cat}
              {cat !== "All" && (
                <span className="ml-1.5 opacity-60">{TOOLS.filter(t => t.category === cat).length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => handlePickTool(tool.id)}
                className="bg-card rounded-lg border border-border p-5 shadow-card hover:shadow-elevated transition-all text-left hover:-translate-y-1 flex flex-col"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-11 h-11 rounded-lg bg-gradient-to-br ${tool.color} flex items-center justify-center`}>
                    <Icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{tool.category}</Badge>
                </div>
                <h4 className="font-display font-semibold text-card-foreground mb-1">{tool.title}</h4>
                <p className="text-xs text-muted-foreground">{tool.description}</p>
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

  // ============ TOOL DETAIL VIEW ============
  const Icon = currentTool!.icon;
  const compareDisabled = currentTool!.kind === "image-gen" || currentTool!.kind === "audio-input";

  const acceptForKind: Record<ToolKind, string> = {
    "text": "", "image-gen": "", "paste-context": "",
    "image-input": "image/*",
    "pdf-input": "application/pdf,.pdf",
    "audio-input": "audio/*",
    "csv-input": ".csv,text/csv",
  };

  const renderUploader = () => {
    const k = currentTool!.kind;
    if (k === "text" || k === "image-gen" || k === "paste-context") return null;

    const hasFile =
      (k === "image-input" && !!imageDataUrl) ||
      (k === "audio-input" && !!audioDataUrl) ||
      ((k === "pdf-input" || k === "csv-input") && !!fileName);

    const displayName =
      k === "image-input" ? imageName :
      k === "audio-input" ? audioName : fileName;

    const labelMap: Record<string, string> = {
      "image-input": "Image (PNG, JPG, WEBP — up to 5 MB)",
      "pdf-input": "PDF document (up to 20 MB, first 50 pages)",
      "audio-input": "Audio file (MP3, WAV, M4A — up to 25 MB)",
      "csv-input": "CSV file (up to 10 MB)",
    };

    return (
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">{currentTool!.contextLabel || "Upload a file"}</label>
        {hasFile ? (
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            {k === "image-input" && imageDataUrl && (
              <img src={imageDataUrl} alt={imageName} className="max-h-40 mx-auto rounded mb-2" />
            )}
            {k === "audio-input" && audioDataUrl && (
              <audio src={audioDataUrl} controls className="w-full mb-2" />
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground truncate max-w-[60%]" title={displayName}>📎 {displayName}</span>
              <button
                onClick={() => {
                  setImageDataUrl(null); setImageName("");
                  setAudioDataUrl(null); setAudioName("");
                  setFileName(""); setContextText("");
                }}
                className="text-destructive hover:underline flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Remove
              </button>
            </div>
            {(k === "pdf-input" || k === "csv-input") && contextText && (
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Preview extracted content</summary>
                <pre className="mt-2 max-h-40 overflow-auto bg-background rounded p-2 text-[10px] whitespace-pre-wrap">{contextText.slice(0, 2000)}{contextText.length > 2000 ? "\n…" : ""}</pre>
              </details>
            )}
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={parsing}
            className="w-full border-2 border-dashed border-border rounded-lg p-6 hover:border-primary transition-colors flex flex-col items-center gap-2 text-muted-foreground hover:text-primary disabled:opacity-60"
          >
            {parsing ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
            <span className="text-sm">{parsing ? "Processing file..." : "Click to upload a file"}</span>
            <span className="text-[10px]">{labelMap[k]}</span>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptForKind[k]}
          className="hidden"
          onChange={handleFileUpload}
        />
        {(k === "pdf-input" || k === "csv-input") && (
          <details className="mt-2">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">…or paste content manually</summary>
            <Textarea
              value={contextText}
              onChange={(e) => { setContextText(e.target.value); if (!fileName) setFileName(""); }}
              placeholder="Paste content here..."
              className="mt-2 min-h-[120px] resize-none font-mono text-xs"
            />
          </details>
        )}
      </div>
    );
  };

  const renderOutputCard = (label: string, body: string, busy: boolean, modelLabel?: string) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          {label}
          {modelLabel && <Badge variant="outline" className="text-[10px]">{modelLabel}</Badge>}
        </label>
        {body && (
          <Button variant="ghost" size="sm" onClick={() => handleCopy(body)} className="gap-1 text-xs">
            {copied ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        )}
      </div>
      <div className="min-h-[300px] bg-muted/50 rounded-lg border border-border p-4 overflow-y-auto" role="region" aria-live="polite">
        {body ? (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{body}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">{busy ? "Generating..." : "Output will appear here..."}</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${currentTool!.color} flex items-center justify-center`}>
            <Icon className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-semibold text-foreground">{currentTool!.title}</h3>
              <Badge variant="outline" className="text-[10px] uppercase">{currentTool!.category}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{currentTool!.description}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => { setSelectedTool(null); resetState(); }}>
          ← All Tools
        </Button>
      </div>

      {/* Compare-models toggle */}
      {!compareDisabled && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">Compare 2 models</p>
              <p className="text-[11px] text-muted-foreground">
                Run the same prompt through <span className="font-medium">{COMPARE_MODELS.a.label}</span> and <span className="font-medium">{COMPARE_MODELS.b.label}</span> side-by-side
              </p>
            </div>
          </div>
          <Switch checked={compareMode} onCheckedChange={setCompareMode} aria-label="Compare two models" />
        </div>
      )}

      {/* Sample prompts */}
      <div className="bg-muted/40 rounded-lg border border-border p-3">
        <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-2">Try one of these</p>
        <div className="flex flex-wrap gap-2">
          {currentTool!.samples.map((s) => (
            <button
              key={s}
              onClick={() => setInput(s)}
              className="text-xs px-3 py-1.5 rounded-full bg-background border border-border hover:border-primary hover:text-primary transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className={`grid gap-4 ${compareMode ? "lg:grid-cols-1" : "lg:grid-cols-2"}`}>
        {/* INPUT COLUMN */}
        <div className="space-y-3">
          {renderUploader()}

          <label className="text-sm font-medium text-foreground">
            {currentTool!.kind === "text" || currentTool!.kind === "image-gen" ? "Input" : "Question / Instructions (optional)"}
          </label>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={currentTool!.placeholder}
            className={currentTool!.kind === "text" || currentTool!.kind === "image-gen" ? "min-h-[200px] resize-none" : "min-h-[100px] resize-none"}
          />
          <Button
            onClick={handleRun}
            disabled={isLoading || isLoadingA || isLoadingB || parsing}
            className="w-full bg-gradient-primary border-0 text-primary-foreground gap-2"
          >
            {(isLoading || isLoadingA || isLoadingB) ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
            {(isLoading || isLoadingA || isLoadingB) ? "Processing..." : (compareMode ? `Compare with ${COMPARE_MODELS.a.label} & ${COMPARE_MODELS.b.label}` : currentTool!.buttonText)}
          </Button>
        </div>

        {/* OUTPUT COLUMN(S) */}
        {!compareMode && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Output</label>
              {output && (
                <Button variant="ghost" size="sm" onClick={() => handleCopy(output)} className="gap-1 text-xs">
                  {copied ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              )}
            </div>
            <div className="min-h-[300px] bg-muted/50 rounded-lg border border-border p-4 overflow-y-auto" role="region" aria-label="AI output" aria-live="polite">
              {generatedImage ? (
                <div className="space-y-3">
                  <img src={generatedImage} alt="Generated" className="rounded-lg border border-border w-full" />
                  <a href={generatedImage} download="ai-generated-image.png" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <Download className="h-3 w-3" /> Download image
                  </a>
                </div>
              ) : output ? (
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
                <p className="text-sm text-muted-foreground italic">{isLoading ? "Generating response..." : "Output will appear here..."}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* COMPARE OUTPUTS — full-width grid below input */}
      {compareMode && (
        <div className="grid gap-4 lg:grid-cols-2">
          {renderOutputCard("Model A", outputA, isLoadingA, COMPARE_MODELS.a.label)}
          {renderOutputCard("Model B", outputB, isLoadingB, COMPARE_MODELS.b.label)}
        </div>
      )}
    </div>
  );
};

export default AIToolsSandbox;
