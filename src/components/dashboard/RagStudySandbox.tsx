import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Loader2, Send, Sparkles, BookOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";

const EMBEDDING_MODELS = [
  { value: "google/text-embedding-004", label: "Google Text Embedding 004 (default, fast)" },
  { value: "openai/text-embedding-3-small", label: "OpenAI text-embedding-3-small" },
];

interface RagDoc {
  id: string;
  file_name: string;
  topic: string;
  status: string;
  chunk_count: number;
  embedding_model: string;
  error_message: string;
  created_at: string;
}

interface Citation {
  ref: number;
  chunkIndex: number;
  page?: number;
  similarity: number;
  excerpt: string;
}

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

const RagStudySandbox = () => {
  const studentId = sessionStorage.getItem("studentId");
  const studentName = sessionStorage.getItem("studentName") || "Student";

  const [docs, setDocs] = useState<RagDoc[]>([]);
  const [activeDoc, setActiveDoc] = useState<RagDoc | null>(null);
  const [embeddingModel, setEmbeddingModel] = useState(EMBEDDING_MODELS[0].value);
  const [topic, setTopic] = useState("");
  const [uploading, setUploading] = useState(false);
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const loadDocs = async () => {
    if (!studentId) return;
    const { data } = await supabase.from("rag_documents")
      .select("*").eq("student_id", studentId).order("created_at", { ascending: false }).limit(20);
    setDocs((data as RagDoc[]) || []);
  };

  useEffect(() => { loadDocs(); }, [studentId]);

  // Poll status of any document still embedding
  useEffect(() => {
    const pending = docs.filter((d) => d.status === "pending" || d.status === "embedding");
    if (!pending.length) return;
    const t = setInterval(loadDocs, 2500);
    return () => clearInterval(t);
  }, [docs]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight });
  }, [history]);

  // Read text from a file. PDFs/DOCX → strip raw text by best effort (browser text decode).
  // For richer parsing, the file is also uploaded so future improvements can re-process server-side.
  const extractText = async (file: File): Promise<string> => {
    if (file.type.startsWith("text/") || file.name.endsWith(".md") || file.name.endsWith(".txt")) {
      return await file.text();
    }
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      // pdfjs-dist would be ideal; fall back to crude byte string extraction so common PDFs still work.
      const buf = await file.arrayBuffer();
      const text = new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(buf));
      // Pull out parenthesised text segments commonly found in PDF content streams.
      const matches = text.match(/\(([^)]{2,200})\)/g) || [];
      const cleaned = matches.map((m) => m.slice(1, -1).replace(/\\[rn]/g, " ")).join(" ");
      return cleaned.length > 200 ? cleaned : text.replace(/[^\x20-\x7E\n]+/g, " ");
    }
    // Generic fallback
    return await file.text().catch(() => "");
  };

  const handleUpload = async (file: File) => {
    if (!studentId) { toast.error("Sign in required"); return; }
    if (file.size > 15 * 1024 * 1024) { toast.error("Max 15 MB"); return; }
    setUploading(true);
    try {
      const text = await extractText(file);
      if (!text || text.trim().length < 200) {
        toast.error("Couldn't extract enough text from this file. Try a .txt or .md export.");
        setUploading(false);
        return;
      }
      const path = `${studentId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("rag-documents").upload(path, file);
      if (upErr) console.warn("storage upload failed:", upErr);

      const { data: doc, error: dErr } = await supabase.from("rag_documents").insert({
        student_id: studentId,
        student_name: studentName,
        topic: topic.trim(),
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || "application/octet-stream",
        storage_path: path,
        embedding_model: embeddingModel,
        status: "pending",
      }).select().single();

      if (dErr || !doc) { toast.error(dErr?.message || "Could not save"); setUploading(false); return; }

      // Kick off embedding
      const { error: eErr } = await supabase.functions.invoke("rag-embed-document", {
        body: { documentId: doc.id, text, embeddingModel },
      });
      if (eErr) {
        toast.error("Embedding failed: " + eErr.message);
      } else {
        toast.success("Document uploaded — embedding in progress");
        setActiveDoc(doc as RagDoc);
        setHistory([]);
      }
      await loadDocs();
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onAsk = async () => {
    if (!activeDoc || !question.trim()) return;
    if (activeDoc.status !== "ready") { toast.error("Document is still processing"); return; }
    const q = question.trim();
    setHistory((h) => [...h, { role: "user", content: q }]);
    setQuestion("");
    setAsking(true);
    try {
      const { data, error } = await supabase.functions.invoke("rag-chat", {
        body: {
          documentId: activeDoc.id,
          question: q,
          embeddingModel: activeDoc.embedding_model,
          history: history.slice(-6).map((t) => ({ role: t.role, content: t.content })),
        },
      });
      if (error) throw error;
      setHistory((h) => [...h, { role: "assistant", content: data.answer, citations: data.citations || [] }]);
    } catch (e: any) {
      toast.error(e?.message || "Failed to get answer");
      setHistory((h) => [...h, { role: "assistant", content: "Sorry, I couldn't answer that just now." }]);
    } finally {
      setAsking(false);
    }
  };

  const onDelete = async (doc: RagDoc) => {
    if (!confirm(`Delete "${doc.file_name}"?`)) return;
    await supabase.from("rag_documents").delete().eq("id", doc.id);
    if (activeDoc?.id === doc.id) { setActiveDoc(null); setHistory([]); }
    loadDocs();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left: upload + library */}
      <div className="lg:col-span-1 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" /> RAG Study Sandbox
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Embedding model</label>
              <Select value={embeddingModel} onValueChange={setEmbeddingModel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EMBEDDING_MODELS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Topic (optional)</label>
              <Input placeholder="e.g. Transformer architecture" value={topic} onChange={(e) => setTopic(e.target.value)} />
            </div>
            <Button
              variant="outline"
              className="w-full"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload .txt / .md / .pdf (≤15MB)
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,.pdf,text/plain,text/markdown,application/pdf"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Your documents</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {docs.length === 0 && <p className="text-xs text-muted-foreground">No documents yet.</p>}
            {docs.map((d) => (
              <div key={d.id} className={`p-2 rounded-lg border ${activeDoc?.id === d.id ? "border-primary bg-primary/5" : "border-border"}`}>
                <button className="w-full text-left" onClick={() => { setActiveDoc(d); setHistory([]); }}>
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{d.file_name}</p>
                      {d.topic && <p className="text-xs text-muted-foreground truncate">{d.topic}</p>}
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {d.status === "ready" ? `${d.chunk_count} chunks` : d.status}
                        </Badge>
                        {d.status === "embedding" && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                      </div>
                      {d.status === "failed" && <p className="text-[10px] text-destructive mt-0.5">{d.error_message}</p>}
                    </div>
                  </div>
                </button>
                <div className="flex justify-end mt-1">
                  <Button size="sm" variant="ghost" onClick={() => onDelete(d)} className="h-6 px-2">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Right: chat */}
      <Card className="lg:col-span-2 flex flex-col h-[70vh]">
        <CardHeader className="border-b border-border py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            {activeDoc ? `Chat: ${activeDoc.file_name}` : "Select a document to start chatting"}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col p-0">
          <div ref={scrollerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {!activeDoc && (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Upload a study document and ask questions — answers will cite the source excerpts.
              </div>
            )}
            {history.map((t, i) => (
              <div key={i} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-lg p-3 text-sm ${t.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <div className="whitespace-pre-wrap">{t.content}</div>
                  {t.citations && t.citations.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">Sources</p>
                      {t.citations.map((c) => (
                        <div key={c.ref} className="text-[11px] opacity-85">
                          <span className="font-mono font-bold">[{c.ref}]</span>{" "}
                          {c.page ? `p.${c.page} · ` : ""}chunk {c.chunkIndex} · {(c.similarity * 100).toFixed(0)}% match
                          <p className="opacity-70 italic line-clamp-2">{c.excerpt}…</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {asking && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </div>
          <div className="border-t border-border p-3 flex gap-2">
            <Textarea
              className="min-h-[44px] max-h-32 resize-none"
              placeholder={activeDoc ? "Ask a question about the document…" : "Pick a document first"}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onAsk(); } }}
              disabled={!activeDoc || asking}
            />
            <Button onClick={onAsk} disabled={!activeDoc || asking || !question.trim()}>
              {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RagStudySandbox;
