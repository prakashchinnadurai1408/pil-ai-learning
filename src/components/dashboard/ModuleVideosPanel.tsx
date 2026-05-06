import { useEffect, useMemo, useState } from "react";
import { Play, Video, Clock, ExternalLink } from "lucide-react";
import { videoLessons } from "@/data/videoContent";
import { usePublishedSectionContent } from "@/hooks/useAdminSectionContent";
import { bestTopicId } from "@/lib/topicMatch";
import InModuleVideoQuiz from "./InModuleVideoQuiz";

interface TopicLite { id: string; title: string }

interface ModuleVideosPanelProps {
  moduleId: number;
  topics?: TopicLite[];
  activeTopicId?: string | null;
  activeTopicTitle?: string | null;
}

const ModuleVideosPanel = ({ moduleId, topics = [], activeTopicId, activeTopicTitle }: ModuleVideosPanelProps) => {
  const { items: adminVideos } = usePublishedSectionContent("videos");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const videos = useMemo(() => {
    // Admin videos: filter by topic_id when a topic is active
    const adminVids = adminVideos
      .filter((v) => v.module_id === moduleId)
      .filter((v) => !activeTopicId || v.topic_id === activeTopicId)
      .map((v) => {
        const c = v.content as any;
        return { id: `a-${v.id}`, title: c?.title || v.title, duration: c?.duration || "—", youtubeId: c?.youtubeId };
      });

    // Static videos: auto-match to active topic by keyword overlap with its title
    const staticVids = videoLessons
      .filter((v) => v.moduleId === moduleId)
      .filter((v) => {
        if (!activeTopicId || !topics.length) return true;
        const matchedId = bestTopicId(v.title, topics);
        return matchedId === activeTopicId;
      })
      .map((v) => ({ id: `s-${v.id}`, title: v.title, duration: v.duration, youtubeId: v.youtubeId }));

    return [...adminVids, ...staticVids];
  }, [adminVideos, moduleId, activeTopicId, topics]);

  // Reset selection whenever the topic context changes so playback starts at #1.
  useEffect(() => { setSelectedId(null); }, [activeTopicId, moduleId]);

  const selected = videos.find((v) => v.id === selectedId) || videos[0];
  const currentIdx = videos.findIndex((v) => v.id === (selected?.id ?? ""));

  const playNext = () => {
    if (currentIdx >= 0 && currentIdx < videos.length - 1) {
      setSelectedId(videos[currentIdx + 1].id);
    }
  };

  if (videos.length === 0) {
    return (
      <div className="p-12 text-center text-sm text-muted-foreground">
        <Video className="h-10 w-10 mx-auto mb-3 opacity-40" />
        {activeTopicTitle
          ? <>No videos linked to <span className="font-medium text-foreground">{activeTopicTitle}</span> yet.</>
          : <>No videos linked to this module yet.</>}
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-4 p-4">
      <div className="lg:col-span-2 space-y-3">
        {selected?.youtubeId ? (
          <div className="aspect-video rounded-lg overflow-hidden bg-black">
            <iframe
              key={selected.id}
              src={`https://www.youtube.com/embed/${selected.youtubeId}?enablejsapi=1`}
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
          <div className="flex items-start justify-between gap-3">
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
            {currentIdx < videos.length - 1 && (
              <button onClick={playNext} className="text-xs text-primary hover:underline whitespace-nowrap">
                Next video →
              </button>
            )}
          </div>
        )}
        {selected && (
          <InModuleVideoQuiz
            videoTitle={selected.title}
            youtubeId={selected.youtubeId}
            moduleId={moduleId}
          />
        )}
      </div>
      <div className="space-y-2 max-h-[480px] overflow-y-auto">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          {videos.length} video{videos.length === 1 ? "" : "s"}
          {activeTopicTitle && <> · <span className="text-primary normal-case tracking-normal">{activeTopicTitle}</span></>}
        </p>
        {videos.map((v, i) => (
          <button
            key={v.id}
            onClick={() => setSelectedId(v.id)}
            className={`w-full text-left p-2.5 rounded-lg border transition-colors flex items-center gap-2 ${
              selected?.id === v.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
            }`}
          >
            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0 text-[10px] font-semibold text-primary">
              {selected?.id === v.id ? <Play className="h-3.5 w-3.5" /> : i + 1}
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
