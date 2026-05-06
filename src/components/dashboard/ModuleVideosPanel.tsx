import { useEffect, useMemo, useRef, useState } from "react";
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

interface Chapter { index: number; title: string; start: number }

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s)) % 60).padStart(2, "0")}`;

// Inject YT API once
let ytLoading: Promise<void> | null = null;
const loadYouTubeAPI = () => {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as any).YT?.Player) return Promise.resolve();
  if (ytLoading) return ytLoading;
  ytLoading = new Promise((resolve) => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    (window as any).onYouTubeIframeAPIReady = () => resolve();
  });
  return ytLoading;
};

const ModuleVideosPanel = ({ moduleId, topics = [], activeTopicId, activeTopicTitle }: ModuleVideosPanelProps) => {
  const { items: adminVideos } = usePublishedSectionContent("videos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const playerRef = useRef<any>(null);
  const playerElId = useRef(`yt-player-${Math.random().toString(36).slice(2)}`);

  const videos = useMemo(() => {
    const adminVids = adminVideos
      .filter((v) => v.module_id === moduleId)
      .filter((v) => !activeTopicId || v.topic_id === activeTopicId)
      .map((v) => {
        const c = v.content as any;
        return { id: `a-${v.id}`, title: c?.title || v.title, duration: c?.duration || "—", youtubeId: c?.youtubeId };
      });
    const staticVids = videoLessons
      .filter((v) => v.moduleId === moduleId)
      .filter((v) => {
        if (!activeTopicId || !topics.length) return true;
        return bestTopicId(v.title, topics) === activeTopicId;
      })
      .map((v) => ({ id: `s-${v.id}`, title: v.title, duration: v.duration, youtubeId: v.youtubeId }));
    return [...adminVids, ...staticVids];
  }, [adminVideos, moduleId, activeTopicId, topics]);

  useEffect(() => { setSelectedId(null); setChapters([]); setCurrentTime(0); }, [activeTopicId, moduleId]);

  const selected = videos.find((v) => v.id === selectedId) || videos[0];
  const currentIdx = videos.findIndex((v) => v.id === (selected?.id ?? ""));

  const playNext = () => {
    if (currentIdx >= 0 && currentIdx < videos.length - 1) setSelectedId(videos[currentIdx + 1].id);
  };

  // Initialize YouTube player when video changes
  useEffect(() => {
    if (!selected?.youtubeId) return;
    let pollTimer: any;
    let cancelled = false;
    (async () => {
      await loadYouTubeAPI();
      if (cancelled) return;
      const YT = (window as any).YT;
      if (playerRef.current?.destroy) { try { playerRef.current.destroy(); } catch {/* ignore */} }
      playerRef.current = new YT.Player(playerElId.current, {
        videoId: selected.youtubeId,
        playerVars: { enablejsapi: 1, rel: 0 },
        events: {
          onReady: () => {
            pollTimer = setInterval(() => {
              try {
                const t = playerRef.current?.getCurrentTime?.();
                if (typeof t === "number") setCurrentTime(t);
              } catch {/* ignore */}
            }, 500);
          },
        },
      });
    })();
    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      try { playerRef.current?.destroy?.(); } catch {/* ignore */}
      playerRef.current = null;
    };
  }, [selected?.youtubeId]);

  const seekTo = (seconds: number) => {
    try {
      playerRef.current?.seekTo?.(seconds, true);
      playerRef.current?.playVideo?.();
      setCurrentTime(seconds);
    } catch {/* ignore */}
  };

  // Determine active chapter from currentTime
  const activeChapterIndex = useMemo(() => {
    if (chapters.length === 0) return -1;
    let idx = 0;
    for (let i = 0; i < chapters.length; i++) {
      if (currentTime >= chapters[i].start) idx = i;
    }
    return chapters[idx]?.index ?? -1;
  }, [chapters, currentTime]);

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
          <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
            <div id={playerElId.current} key={selected.id} className="w-full h-full" />
            {/* Synced timer overlay */}
            <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-black/70 text-white text-xs font-mono flex items-center gap-1 pointer-events-none">
              <Clock className="h-3 w-3" /> {fmt(currentTime)}
            </div>
            {chapters.length > 0 && activeChapterIndex >= 0 && (
              <div className="absolute bottom-2 left-2 px-2 py-1 rounded-md bg-primary/90 text-primary-foreground text-[10px] font-medium pointer-events-none max-w-[60%] truncate">
                Ch {activeChapterIndex + 1}: {chapters.find((c) => c.index === activeChapterIndex)?.title}
              </div>
            )}
          </div>
        ) : (
          <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Select a video to play</p>
          </div>
        )}

        {/* Chapter navigation strip */}
        {chapters.length > 0 && (
          <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-border bg-muted/20">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase mr-1 self-center">Jump to:</span>
            {chapters.map((c, i) => {
              const isActive = c.index === activeChapterIndex;
              return (
                <button
                  key={c.index}
                  onClick={() => seekTo(c.start)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition ${
                    isActive ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-primary/10 hover:border-primary"
                  }`}
                  title={c.title}
                >
                  {i + 1}. {fmt(c.start)} · {c.title.length > 22 ? c.title.slice(0, 22) + "…" : c.title}
                </button>
              );
            })}
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
            onSeek={seekTo}
            onChapters={setChapters}
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
