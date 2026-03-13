import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sparkles, Video, MessageSquare, FlaskConical, ClipboardCheck, FolderKanban,
  Loader2, Trash2, Check, AlertTriangle, Eye
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAdminSectionContent } from "@/hooks/useAdminSectionContent";
import { useAdminModules } from "@/hooks/useAdminModules";

const SECTION_TYPES = [
  { id: "videos", label: "Videos", icon: Video },
  { id: "ai_chat", label: "AI Chat", icon: MessageSquare },
  { id: "tools", label: "Tools", icon: FlaskConical },
  { id: "assessments", label: "Assessments", icon: ClipboardCheck },
  { id: "projects", label: "Projects", icon: FolderKanban },
];

const ContentManager = () => {
  const [activeSection, setActiveSection] = useState("videos");
  const { items, loading, refetch } = useAdminSectionContent(activeSection);
  const { adminModules } = useAdminModules();
  const [topic, setTopic] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishConfirmId, setPublishConfirmId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"publish" | "delete" | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const draftItems = items.filter(i => i.status === "draft");
  const allDraftsSelected = draftItems.length > 0 && draftItems.every(i => selectedIds.has(i.id));

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAllDrafts = () => {
    if (allDraftsSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(draftItems.map(i => i.id)));
    }
  };

  const handleBulkPublish = async () => {
    setBulkProcessing(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from("admin_section_content")
      .update({ status: "published" } as any)
      .in("id", ids);
    setBulkProcessing(false);
    setBulkAction(null);
    if (error) { toast.error("Bulk publish failed"); return; }
    toast.success(`${ids.length} items published!`);
    setSelectedIds(new Set());
    refetch();
  };

  const handleBulkDelete = async () => {
    setBulkProcessing(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from("admin_section_content")
      .delete()
      .in("id", ids);
    setBulkProcessing(false);
    setBulkAction(null);
    if (error) { toast.error("Bulk delete failed"); return; }
    toast.success(`${ids.length} items deleted!`);
    setSelectedIds(new Set());
    refetch();
  };

  const moduleName = selectedModuleId
    ? adminModules.find(m => m.id === Number(selectedModuleId))?.title || `Module ${selectedModuleId}`
    : "";

  const handleGenerate = async () => {
    if (!topic.trim()) { toast.error("Enter a topic"); return; }
    if (!selectedModuleId) { toast.error("Select a module"); return; }
    setGenerating(true);
    setGeneratedContent(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-section-content", {
        body: { sectionType: activeSection, topic: topic.trim(), moduleName },
      });
      if (error || !data?.content) throw new Error("Failed");
      setGeneratedContent(data.content);
      toast.success(`Generated ${data.content.length} items!`);
    } catch {
      toast.error("AI generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedContent || generatedContent.length === 0) return;
    setSaving(true);

    const rows = generatedContent.map((item, i) => ({
      module_id: Number(selectedModuleId),
      section_type: activeSection,
      title: item.title || item.prompt || item.question || `${topic} - Item ${i + 1}`,
      content: item,
      status: "draft",
      sort_order: i,
    }));

    const { error } = await supabase.from("admin_section_content").insert(rows as any);
    if (error) {
      toast.error("Failed to save content");
      setSaving(false);
      return;
    }

    toast.success(`${rows.length} items saved as draft — review before publishing!`);
    setGeneratedContent(null);
    setTopic("");
    setSaving(false);
    refetch();
  };

  const handlePublish = async (id: string) => {
    const { error } = await supabase
      .from("admin_section_content")
      .update({ status: "published" } as any)
      .eq("id", id);
    if (error) { toast.error("Failed to publish"); return; }
    toast.success("Content published!");
    setPublishConfirmId(null);
    refetch();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("admin_section_content").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Content deleted");
    refetch();
  };

  const renderContentPreview = (content: any) => {
    if (content.question) return content.question;
    if (content.prompt) return content.prompt;
    if (content.description) return content.description;
    if (content.title) return content.title;
    return JSON.stringify(content).slice(0, 100);
  };

  const renderGeneratedPreview = (item: any, i: number) => {
    const sectionIcon = SECTION_TYPES.find(s => s.id === activeSection);
    const Icon = sectionIcon?.icon || Sparkles;

    return (
      <div key={i} className="bg-card rounded-lg border border-border p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm text-card-foreground">
            {item.title || item.prompt || item.question || `Item ${i + 1}`}
          </span>
        </div>
        {item.description && <p className="text-xs text-muted-foreground pl-6">{item.description}</p>}
        {item.options && (
          <div className="pl-6 space-y-1">
            {item.options.map((opt: string, oi: number) => (
              <p key={oi} className={`text-xs ${oi === item.correct ? "text-success font-medium" : "text-muted-foreground"}`}>
                {String.fromCharCode(65 + oi)}. {opt}
              </p>
            ))}
          </div>
        )}
        {item.steps && (
          <div className="pl-6 space-y-1">
            {item.steps.slice(0, 3).map((s: string, si: number) => (
              <p key={si} className="text-xs text-muted-foreground">{si + 1}. {s}</p>
            ))}
            {item.steps.length > 3 && <p className="text-xs text-muted-foreground">...+{item.steps.length - 3} more</p>}
          </div>
        )}
        {item.skills && (
          <div className="pl-6 flex flex-wrap gap-1">
            {item.skills.map((s: string, si: number) => (
              <span key={si} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{s}</span>
            ))}
          </div>
        )}
        {item.youtubeQuery && (
          <p className="text-xs text-muted-foreground pl-6">🔍 {item.youtubeQuery}</p>
        )}
        {item.toolType && (
          <p className="text-xs text-muted-foreground pl-6">🛠️ Tool: {item.toolType}</p>
        )}
        {item.category && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground ml-6">{item.category}</span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeSection} onValueChange={(v) => { setActiveSection(v); setGeneratedContent(null); setTopic(""); }}>
        <TabsList className="bg-muted p-1 mb-6">
          {SECTION_TYPES.map(s => {
            const Icon = s.icon;
            return (
              <TabsTrigger key={s.id} value={s.id} className="gap-1.5 text-xs data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <Icon className="h-3.5 w-3.5" /> {s.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {SECTION_TYPES.map(section => (
          <TabsContent key={section.id} value={section.id}>
            {/* AI Generator */}
            <Card className="border-2 border-dashed border-primary/30 bg-primary/5 mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Generate {section.label} Content with AI
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Topic / Title</Label>
                    <Input
                      placeholder={`e.g., Advanced ${section.label} topic...`}
                      value={topic}
                      onChange={e => setTopic(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Module</Label>
                    <Select value={selectedModuleId} onValueChange={setSelectedModuleId}>
                      <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
                      <SelectContent>
                        {adminModules.map(m => (
                          <SelectItem key={m.id} value={String(m.id)}>{m.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  className="gap-2 bg-gradient-accent border-0 text-accent-foreground hover:opacity-90"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {generating ? "Generating..." : `Generate ${section.label} with AI`}
                </Button>

                {generatedContent && generatedContent.length > 0 && (
                  <div className="space-y-3 mt-4">
                    <h4 className="font-display font-semibold text-sm text-card-foreground">
                      Generated Content ({generatedContent.length} items)
                    </h4>
                    {generatedContent.map((item, i) => renderGeneratedPreview(item, i))}
                    <Button
                      className="w-full gap-2 bg-gradient-primary border-0 text-primary-foreground"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Save as Draft for Review
                    </Button>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <AlertTriangle className="h-3 w-3 text-warning" />
                      AI-generated content must be reviewed before publishing.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Existing Content */}
            <div>
              <h3 className="font-display font-semibold text-card-foreground mb-4">
                {section.label} Content ({loading ? "..." : items.length})
              </h3>
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : items.length === 0 ? (
                <div className="text-sm text-muted-foreground bg-card border border-border rounded-lg p-8 text-center">
                  No {section.label.toLowerCase()} content yet. Use the AI generator above.
                </div>
              ) : (
                <div className="grid gap-3">
                  {items.map(item => (
                    <div key={item.id} className="bg-card rounded-lg border border-border p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <section.icon className="h-4 w-4 text-primary flex-shrink-0" />
                        <div className="min-w-0">
                          <span className="font-medium text-sm text-card-foreground block truncate">{item.title}</span>
                          <p className="text-xs text-muted-foreground truncate">{renderContentPreview(item.content)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          item.status === "published" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                        }`}>
                          {item.status === "published" ? "Published" : "Draft"}
                        </span>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setPreviewItem(item)}>
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        {item.status === "draft" && (
                          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setPublishConfirmId(item.id)}>
                            <Check className="h-3 w-3" /> Publish
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Publish Confirmation */}
      <AlertDialog open={publishConfirmId !== null} onOpenChange={(open) => !open && setPublishConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Confirm Publication
            </AlertDialogTitle>
            <AlertDialogDescription>
              Have you reviewed this AI-generated content? Once published, students and trainers will see this content immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back & Review</AlertDialogCancel>
            <AlertDialogAction onClick={() => publishConfirmId && handlePublish(publishConfirmId)}>
              Yes, Publish Content
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog */}
      <AlertDialog open={previewItem !== null} onOpenChange={(open) => !open && setPreviewItem(null)}>
        <AlertDialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>{previewItem?.title}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(previewItem?.content, null, 2)}
                </pre>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ContentManager;
