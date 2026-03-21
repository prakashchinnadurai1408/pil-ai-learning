import { useState, useMemo } from "react";
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
  Loader2, Trash2, Check, AlertTriangle, Eye, Search, X
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
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterModuleId, setFilterModuleId] = useState<string>("all");
  const [generatingAllTopics, setGeneratingAllTopics] = useState(false);
  const [editingYoutubeId, setEditingYoutubeId] = useState<string | null>(null);
  const [youtubeIdInput, setYoutubeIdInput] = useState("");
  const [fetchingYoutubeIds, setFetchingYoutubeIds] = useState(false);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (filterStatus !== "all" && item.status !== filterStatus) return false;
      if (filterModuleId !== "all" && String(item.module_id) !== filterModuleId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const contentStr = typeof item.content === "object" ? JSON.stringify(item.content) : "";
        if (!item.title.toLowerCase().includes(q) && !contentStr.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [items, searchQuery, filterStatus, filterModuleId]);

  const draftItems = filteredItems.filter(i => i.status === "draft");
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

  const handleGenerateAllTopicVideos = async () => {
    const publishedModules = adminModules.filter(m => m.status === "published" || m.status === "draft");
    if (publishedModules.length === 0) {
      toast.error("No modules found. Create modules first.");
      return;
    }
    setGeneratingAllTopics(true);
    let totalGenerated = 0;

    for (const mod of publishedModules) {
      for (const topic of mod.topics) {
        try {
          const { data, error } = await supabase.functions.invoke("generate-section-content", {
            body: { sectionType: "videos", topic: topic.title, moduleName: mod.title },
          });
          if (error || !data?.content) continue;

          const rows = data.content.map((item: any, i: number) => ({
            module_id: mod.id,
            section_type: "videos",
            title: item.title || `${topic.title} - Video ${i + 1}`,
            content: item,
            status: "draft",
            sort_order: i,
          }));

          await supabase.from("admin_section_content").insert(rows as any);
          totalGenerated += rows.length;
        } catch {
          // continue with next topic
        }
      }
    }

    setGeneratingAllTopics(false);
    toast.success(`Generated ${totalGenerated} videos across all module topics! Review and publish them.`);
    refetch();
  };

  const handleSaveYoutubeId = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const updatedContent = { ...(item.content as any), youtubeId: youtubeIdInput.trim() || null };
    const { error } = await supabase
      .from("admin_section_content")
      .update({ content: updatedContent } as any)
      .eq("id", itemId);
    if (error) { toast.error("Failed to save YouTube ID"); return; }
    toast.success("YouTube ID saved!");
    setEditingYoutubeId(null);
    setYoutubeIdInput("");
    refetch();
  };

  const handleBulkFetchYoutubeIds = async () => {
    const videosWithoutId = items.filter(item => {
      const c = item.content as any;
      return !c?.youtubeId && c?.youtubeQuery;
    });
    if (videosWithoutId.length === 0) {
      toast.info("All videos already have YouTube IDs!");
      return;
    }
    setFetchingYoutubeIds(true);
    let updated = 0;
    for (const item of videosWithoutId) {
      try {
        const c = item.content as any;
        const { data } = await supabase.functions.invoke("youtube-search", {
          body: { query: c.youtubeQuery },
        });
        if (data?.videoId) {
          const updatedContent = { ...c, youtubeId: data.videoId };
          await supabase
            .from("admin_section_content")
            .update({ content: updatedContent } as any)
            .eq("id", item.id);
          updated++;
        }
      } catch { /* continue */ }
    }
    setFetchingYoutubeIds(false);
    toast.success(`Fetched YouTube IDs for ${updated}/${videosWithoutId.length} videos!`);
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
      <Tabs value={activeSection} onValueChange={(v) => { setActiveSection(v); setGeneratedContent(null); setTopic(""); setSelectedIds(new Set()); setSearchQuery(""); setFilterStatus("all"); setFilterModuleId("all"); }}>
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

                {section.id === "videos" && (
                  <Button
                    variant="outline"
                    className="gap-2 text-sm"
                    onClick={handleGenerateAllTopicVideos}
                    disabled={generatingAllTopics || generating}
                  >
                    {generatingAllTopics ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}
                    {generatingAllTopics ? "Generating for all topics..." : "Generate Videos for All Topics"}
                  </Button>
                )}

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
              {/* Search & Filters */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search content..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-8 h-9 text-sm"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                      <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[130px] h-9 text-sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterModuleId} onValueChange={setFilterModuleId}>
                  <SelectTrigger className="w-[160px] h-9 text-sm">
                    <SelectValue placeholder="Module" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modules</SelectItem>
                    {adminModules.map(m => (
                      <SelectItem key={m.id} value={String(m.id)}>{m.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold text-card-foreground">
                  {section.label} Content ({loading ? "..." : filteredItems.length}{filteredItems.length !== items.length ? ` of ${items.length}` : ""})
                </h3>
                {draftItems.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="text-xs gap-1.5" onClick={toggleAllDrafts}>
                      <Checkbox checked={allDraftsSelected} className="h-3.5 w-3.5" />
                      {allDraftsSelected ? "Deselect all" : "Select all drafts"}
                    </Button>
                  </div>
                )}
              </div>

              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 mb-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <span className="text-sm font-medium text-card-foreground">{selectedIds.size} selected</span>
                  <div className="ml-auto flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setBulkAction("publish")}>
                      <Check className="h-3 w-3" /> Publish Selected
                    </Button>
                    <Button size="sm" variant="destructive" className="gap-1 text-xs" onClick={() => setBulkAction("delete")}>
                      <Trash2 className="h-3 w-3" /> Delete Selected
                    </Button>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : filteredItems.length === 0 ? (
                <div className="text-sm text-muted-foreground bg-card border border-border rounded-lg p-8 text-center">
                  {items.length === 0 ? `No ${section.label.toLowerCase()} content yet. Use the AI generator above.` : "No content matches your filters."}
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredItems.map(item => {
                    const contentData = item.content as any;
                    const hasYoutubeId = !!contentData?.youtubeId;
                    return (
                    <div key={item.id} className="bg-card rounded-lg border border-border p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {item.status === "draft" && (
                            <Checkbox
                              checked={selectedIds.has(item.id)}
                              onCheckedChange={() => toggleSelect(item.id)}
                              className="flex-shrink-0"
                            />
                          )}
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
                      {/* YouTube ID editing for video items */}
                      {activeSection === "videos" && (
                        <div className="flex items-center gap-2 pl-7">
                          {editingYoutubeId === item.id ? (
                            <>
                              <Input
                                placeholder="Paste YouTube Video ID (e.g. dQw4w9WgXcQ)"
                                value={youtubeIdInput}
                                onChange={e => setYoutubeIdInput(e.target.value)}
                                className="h-7 text-xs flex-1 max-w-xs"
                              />
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleSaveYoutubeId(item.id)}>
                                <Check className="h-3 w-3" /> Save
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditingYoutubeId(null); setYoutubeIdInput(""); }}>
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          ) : (
                            <button
                              onClick={() => { setEditingYoutubeId(item.id); setYoutubeIdInput(contentData?.youtubeId || ""); }}
                              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                            >
                              <Video className="h-3 w-3" />
                              {hasYoutubeId ? `YouTube ID: ${contentData.youtubeId}` : "⚠️ No YouTube ID — click to add"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    );
                  })}
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

      {/* Bulk Action Confirmation */}
      <AlertDialog open={bulkAction !== null} onOpenChange={(open) => !open && setBulkAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              {bulkAction === "publish" ? "Bulk Publish" : "Bulk Delete"} ({selectedIds.size} items)
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkAction === "publish"
                ? "Have you reviewed all selected AI-generated content? Once published, students and trainers will see it immediately."
                : "This will permanently delete the selected items. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkProcessing}
              onClick={bulkAction === "publish" ? handleBulkPublish : handleBulkDelete}
              className={bulkAction === "delete" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {bulkProcessing && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {bulkAction === "publish" ? "Publish All" : "Delete All"}
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
