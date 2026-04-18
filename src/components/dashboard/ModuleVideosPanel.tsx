import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Video, Clock, ExternalLink } from "lucide-react";
import { videoLessons } from "@/data/videoContent";
import { usePublishedSectionContent } from "@/hooks/useAdminSectionContent";

interface ModuleVideosPanelProps {
  moduleId: number;
}

const ModuleVideosPanel = ({ moduleId }: ModuleVideosPanelProps) => {
  const { items: adminVideos } = usePublishedSectionContent("videos");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const videos = useMemo(() => {
    const staticVids = videoLessons
      .filter((v) => v.moduleId === moduleId)
      .map((v) => ({ id: `s-${v.id}`, title: v.title, duration: v.duration, youtubeId: v.youtubeId }));
    const adminVids = adminVideos
      .filter((v) => v.module_id === moduleId)
      .map((v) => {
        const c = v.content as any;
        return { id: `a-${v.id}`, title: c?.title || v.title, duration: c?.duration || "—", youtubeId: c?.youtubeId };
      });
    return [...staticVids, ...adminVids];
  }, [adminVideos, moduleId]);

  const selected = videos.find((v) => v.id === selectedId) || videos[0];

  if (videos.length === 0) {
    return (
      <div className="p-12 text-center text-sm text-muted-foreground">
        <Video className="h-10 w-10 mx-auto mb-3 opacity-40" />
        No videos linked to this module yet.
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-4 p-4">
      <div className="lg:col-span-2 space-y-3">
        {selected?.youtubeId ? (
          <div className="aspect-video rounded-lg overflow-hidden bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${selected.youtubeId}`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={selected.title}
            />
          </div>
        ) : (
          <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Select a video to play</p>
          </div>
        )}
        {selected && (
          <div>
            <h3 className="font-display font-semibold text-card-foreground">{selected.title}</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <Clock className="h-3 w-3" /> {selected.duration}
              {selected.youtubeId && (
                <a href={`https://youtu.be/${selected.youtubeId}`} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 text-primary hover:underline">
                  Open on YouTube <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>
      <div className="space-y-2 max-h-[480px] overflow-y-auto">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{videos.length} videos</p>
        {videos.map((v) => (
          <button
            key={v.id}
            onClick={() => setSelectedId(v.id)}
            className={`w-full text-left p-2.5 rounded-lg border transition-colors flex items-center gap-2 ${
              selected?.id === v.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
            }`}
          >
            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Play className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-card-foreground line-clamp-2">{v.title}</p>
              <p className="text-[10px] text-muted-foreground">{v.duration}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ModuleVideosPanel;
