import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { videoLessons, mcqBank, moduleNames } from "@/data/videoContent";
import { Play, CheckCircle, Clock, ChevronRight, Filter, BookOpen, Trophy } from "lucide-react";

const VideoLearning = () => {
  const [selectedVideo, setSelectedVideo] = useState<number | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string>("all");

  const filteredVideos = useMemo(
    () =>
      selectedModule === "all"
        ? videoLessons
        : videoLessons.filter((v) => v.moduleId === Number(selectedModule)),
    [selectedModule]
  );

  const currentVideo = videoLessons.find((v) => v.id === selectedVideo);
  const currentQuizQuestions = useMemo(
    () => (currentVideo ? mcqBank.filter((q) => q.moduleId === currentVideo.moduleId) : []),
    [currentVideo]
  );

  const completedCount = filteredVideos.filter((v) => v.completed).length;

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
                onClick={() => { setSelectedVideo(v.id); setShowQuiz(false); setSubmitted(false); setAnswers({}); }}
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
                  {/* YouTube Embed */}
                  <div className="aspect-video bg-foreground/5">
                    <iframe
                      src={`https://www.youtube.com/embed/${currentVideo.youtubeId}?rel=0&playsinline=1`}
                      title={currentVideo.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      loading="lazy"
                      className="w-full h-full"
                    />
                  </div>
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-display font-semibold text-card-foreground">{currentVideo.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{currentVideo.module} · {currentVideo.duration}</p>
                    </div>
                    <Button
                      onClick={() => { setShowQuiz(true); setAnswers({}); setSubmitted(false); }}
                      className="bg-gradient-primary border-0 text-primary-foreground gap-2 flex-shrink-0"
                    >
                      <Trophy className="h-4 w-4" /> Take Quiz ({currentQuizQuestions.length} Qs)
                    </Button>
                  </div>
                </>
              ) : (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-display font-semibold text-lg text-card-foreground">
                        {currentVideo.module} — Quiz
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {currentQuizQuestions.length} questions · Answer all to submit
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setShowQuiz(false)} className="text-muted-foreground">
                      ← Back to Video
                    </Button>
                  </div>

                  <div className="space-y-5 max-h-[420px] overflow-y-auto pr-2">
                    {currentQuizQuestions.map((q, qi) => (
                      <div key={q.id} className="bg-muted/50 rounded-lg p-5">
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
                          disabled={Object.keys(answers).length < currentQuizQuestions.length}
                          className="bg-gradient-primary border-0 text-primary-foreground"
                        >
                          Submit Answers
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          {Object.keys(answers).length}/{currentQuizQuestions.length} answered
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-warning" />
                          <p className="text-sm font-semibold text-card-foreground">
                            Score: {currentQuizQuestions.filter((q, i) => answers[i] === q.correct).length}/{currentQuizQuestions.length}
                            {" "}({Math.round((currentQuizQuestions.filter((q, i) => answers[i] === q.correct).length / currentQuizQuestions.length) * 100)}%)
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => { setAnswers({}); setSubmitted(false); }}>
                          Retry
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setShowQuiz(false)}>
                          Back to Video
                        </Button>
                      </>
                    )}
                  </div>
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
    </div>
  );
};

export default VideoLearning;
