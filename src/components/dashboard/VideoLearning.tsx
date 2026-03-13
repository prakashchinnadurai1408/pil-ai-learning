import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { videoLessons, mcqBank, moduleNames } from "@/data/videoContent";
import { Play, CheckCircle, Clock, ChevronRight, Filter, BookOpen, Trophy, AlertTriangle, RefreshCw, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePublishedSectionContent } from "@/hooks/useAdminSectionContent";

interface AIQuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

const VideoLearning = () => {
  const [selectedVideo, setSelectedVideo] = useState<number | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string>("all");
  const [videoError, setVideoError] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [aiQuizQuestions, setAiQuizQuestions] = useState<AIQuizQuestion[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState(false);

  const filteredVideos = useMemo(
    () =>
      selectedModule === "all"
        ? videoLessons
        : videoLessons.filter((v) => v.moduleId === Number(selectedModule)),
    [selectedModule]
  );

  const currentVideo = videoLessons.find((v) => v.id === selectedVideo);
  const generateQuiz = useCallback(async (video: typeof currentVideo) => {
    if (!video) return;
    setQuizLoading(true);
    setQuizError(false);
    setAiQuizQuestions([]);
    setAnswers({});
    setSubmitted(false);
    setShowQuiz(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-video-quiz", {
        body: { videoTitle: video.title, moduleName: video.module, questionCount: 5 },
      });
      if (error || !data?.questions) throw new Error("Failed");
      setAiQuizQuestions(data.questions);
    } catch {
      setQuizError(true);
      toast.error("Failed to generate quiz. Please try again.");
    } finally {
      setQuizLoading(false);
    }
  }, []);

  const completedCount = filteredVideos.filter((v) => v.completed).length;

  const handleSelectVideo = useCallback((id: number) => {
    setSelectedVideo(id);
    setShowQuiz(false);
    setSubmitted(false);
    setAnswers({});
    setVideoError(false);
    setVideoLoading(true);
  }, []);

  const handleIframeLoad = useCallback(() => {
    setVideoLoading(false);
    setVideoError(false);
  }, []);

  const handleRetryVideo = useCallback(() => {
    setVideoError(false);
    setVideoLoading(true);
    // Force re-mount by toggling selection
    const current = selectedVideo;
    setSelectedVideo(null);
    setTimeout(() => setSelectedVideo(current), 50);
  }, [selectedVideo]);

  return (
    <div className="space-y-4">
      {/* Module Filter */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={selectedModule} onValueChange={(v) => { setSelectedModule(v); setSelectedVideo(null); setShowQuiz(false); }}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Filter by module" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules ({videoLessons.length} videos)</SelectItem>
            {Object.entries(moduleNames).map(([id, name]) => (
              <SelectItem key={id} value={id}>
                {name} ({videoLessons.filter((v) => v.moduleId === Number(id)).length})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">
          {completedCount}/{filteredVideos.length} completed
        </span>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Video List */}
        <div className="lg:col-span-1 bg-card rounded-lg border border-border shadow-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-display font-semibold text-card-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Video Lessons
            </h3>
          </div>
          <div className="max-h-[520px] overflow-y-auto divide-y divide-border">
            {filteredVideos.map((v) => (
              <button
                key={v.id}
                onClick={() => handleSelectVideo(v.id)}
                aria-label={`Play video: ${v.title}`}
                aria-current={selectedVideo === v.id ? "true" : undefined}
                className={`w-full p-3.5 text-left flex items-center gap-3 hover:bg-muted/50 transition-colors ${
                  selectedVideo === v.id ? "bg-primary/5 border-l-2 border-l-primary" : ""
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  v.completed ? "bg-success/10" : "bg-muted"
                }`}>
                  {v.completed ? <CheckCircle className="h-3.5 w-3.5 text-success" /> : <Play className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-card-foreground truncate">{v.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{v.module}</span>
                    <span>·</span>
                    <Clock className="h-3 w-3 flex-shrink-0" />
                    <span>{v.duration}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Video Player / Quiz */}
        <div className="lg:col-span-2">
          {currentVideo ? (
            <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
              {!showQuiz ? (
                <>
                  {/* YouTube Embed — iOS Safari compatible */}
                  <div className="aspect-video bg-foreground/5 relative">
                    {videoError ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted/80 z-10">
                        <AlertTriangle className="h-8 w-8 text-warning" />
                        <p className="text-sm text-muted-foreground text-center px-4">
                          Video failed to load. Check your connection and try again.
                        </p>
                        <Button variant="outline" size="sm" className="gap-2" onClick={handleRetryVideo}>
                          <RefreshCw className="h-3.5 w-3.5" /> Retry
                        </Button>
                      </div>
                    ) : videoLoading ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs text-muted-foreground">Loading video...</span>
                        </div>
                      </div>
                    ) : null}
                    <iframe
                      key={currentVideo.id}
                      src={`https://www.youtube.com/embed/${currentVideo.youtubeId}?rel=0&playsinline=1&modestbranding=1`}
                      title={currentVideo.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                      allowFullScreen
                      loading="lazy"
                      className="w-full h-full"
                      style={{ WebkitOverflowScrolling: "touch" }}
                      onLoad={handleIframeLoad}
                      onError={() => { setVideoError(true); setVideoLoading(false); }}
                    />
                  </div>
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-display font-semibold text-card-foreground">{currentVideo.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{currentVideo.module} · {currentVideo.duration}</p>
                    </div>
                    <Button
                      onClick={() => generateQuiz(currentVideo)}
                      disabled={quizLoading}
                      className="bg-gradient-primary border-0 text-primary-foreground gap-2 flex-shrink-0"
                    >
                      <Sparkles className="h-4 w-4" /> {quizLoading ? "Generating..." : "Take AI Quiz"}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-display font-semibold text-lg text-card-foreground">
                        {currentVideo.title} — AI Quiz
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {quizLoading ? "Generating questions..." : `${aiQuizQuestions.length} questions · Answer all to submit`}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setShowQuiz(false)} className="text-muted-foreground">
                      ← Back to Video
                    </Button>
                  </div>

                  {quizLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <Loader2 className="h-8 w-8 text-primary animate-spin" />
                      <p className="text-sm text-muted-foreground">AI is generating quiz questions for this video...</p>
                    </div>
                  ) : quizError ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <AlertTriangle className="h-8 w-8 text-warning" />
                      <p className="text-sm text-muted-foreground">Failed to generate quiz questions.</p>
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => generateQuiz(currentVideo)}>
                        <RefreshCw className="h-3.5 w-3.5" /> Try Again
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-5 max-h-[420px] overflow-y-auto pr-2">
                        {aiQuizQuestions.map((q, qi) => (
                          <div key={qi} className="bg-muted/50 rounded-lg p-5">
                            <p className="font-medium mb-3 text-card-foreground text-sm">
                              {qi + 1}. {q.question}
                            </p>
                            <div className="space-y-2">
                              {q.options.map((opt, oi) => (
                                <button
                                  key={oi}
                                  onClick={() => !submitted && setAnswers({ ...answers, [qi]: oi })}
                                  className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-colors ${
                                    submitted
                                      ? oi === q.correct
                                        ? "border-success bg-success/10 text-success font-medium"
                                        : answers[qi] === oi
                                        ? "border-destructive bg-destructive/10 text-destructive"
                                        : "border-border text-muted-foreground"
                                      : answers[qi] === oi
                                      ? "border-primary bg-primary/5 text-foreground"
                                      : "border-border text-muted-foreground hover:border-primary/30"
                                  }`}
                                >
                                  {String.fromCharCode(65 + oi)}. {opt}
                                </button>
                              ))}
                            </div>
                            {submitted && (
                              <p className="text-xs text-muted-foreground mt-2 italic">
                                💡 {q.explanation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="mt-6 flex items-center gap-4 pt-4 border-t border-border">
                        {!submitted ? (
                          <>
                            <Button
                              onClick={() => setSubmitted(true)}
                              disabled={Object.keys(answers).length < aiQuizQuestions.length}
                              className="bg-gradient-primary border-0 text-primary-foreground"
                            >
                              Submit Answers
                            </Button>
                            <span className="text-xs text-muted-foreground">
                              {Object.keys(answers).length}/{aiQuizQuestions.length} answered
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <Trophy className="h-5 w-5 text-warning" />
                              <p className="text-sm font-semibold text-card-foreground">
                                Score: {aiQuizQuestions.filter((q, i) => answers[i] === q.correct).length}/{aiQuizQuestions.length}
                                {" "}({Math.round((aiQuizQuestions.filter((q, i) => answers[i] === q.correct).length / aiQuizQuestions.length) * 100)}%)
                              </p>
                            </div>
                            <Button variant="outline" size="sm" className="gap-2" onClick={() => generateQuiz(currentVideo)}>
                              <Sparkles className="h-3.5 w-3.5" /> New Questions
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setShowQuiz(false)}>
                              Back to Video
                            </Button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-card rounded-lg border border-border p-12 text-center shadow-card">
              <Play className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-display font-semibold text-lg mb-2 text-card-foreground">Select a Video</h3>
              <p className="text-sm text-muted-foreground">Choose a lesson from the list to start watching & take quizzes</p>
            </div>
          )}
        </div>
      </div>

      {/* Admin-published video content */}
      {adminVideos.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-accent" />
            <h3 className="font-display font-semibold text-card-foreground">Additional Video Resources</h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {adminVideos.map(item => (
              <div key={item.id} className="bg-card rounded-lg border border-accent/20 p-4 shadow-card">
                <h4 className="font-medium text-sm text-card-foreground mb-1">{item.title}</h4>
                <p className="text-xs text-muted-foreground mb-2">{item.content?.description || ""}</p>
                {item.content?.duration && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {item.content.duration}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoLearning;