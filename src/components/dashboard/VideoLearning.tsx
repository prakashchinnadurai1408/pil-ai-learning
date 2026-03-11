import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Play, CheckCircle, Clock, ChevronRight } from "lucide-react";

const videos = [
  { id: 1, title: "What is Artificial Intelligence?", module: "Introduction to AI", duration: "12:30", completed: true },
  { id: 2, title: "AI vs Machine Learning vs Deep Learning", module: "Introduction to AI", duration: "15:45", completed: true },
  { id: 3, title: "Getting Started with ChatGPT", module: "AI Tools for Students", duration: "18:20", completed: false },
  { id: 4, title: "Introduction to Prompt Engineering", module: "Prompt Engineering", duration: "20:10", completed: false },
  { id: 5, title: "Multimodal AI Explained", module: "Multimodal AI", duration: "14:50", completed: false },
  { id: 6, title: "Building AI Agents", module: "AI Agents", duration: "22:15", completed: false },
];

const mcqQuestions = [
  {
    question: "What is Prompt Engineering?",
    options: ["Writing instructions for AI", "Training a neural network", "Building hardware", "Programming robots"],
    correct: 0,
  },
  {
    question: "Which of these is an LLM provider?",
    options: ["Adobe", "OpenAI", "Cisco", "Oracle"],
    correct: 1,
  },
];

const VideoLearning = () => {
  const [selectedVideo, setSelectedVideo] = useState<number | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Video List */}
      <div className="lg:col-span-1 bg-card rounded-lg border border-border shadow-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-display font-semibold text-card-foreground">Video Lessons</h3>
          <p className="text-xs text-muted-foreground mt-1">{videos.filter((v) => v.completed).length}/{videos.length} completed</p>
        </div>
        <div className="divide-y divide-border">
          {videos.map((v) => (
            <button
              key={v.id}
              onClick={() => { setSelectedVideo(v.id); setShowQuiz(false); setSubmitted(false); }}
              className={`w-full p-4 text-left flex items-center gap-3 hover:bg-muted/50 transition-colors ${
                selectedVideo === v.id ? "bg-primary/5 border-l-2 border-l-primary" : ""
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                v.completed ? "bg-success/10" : "bg-muted"
              }`}>
                {v.completed ? <CheckCircle className="h-4 w-4 text-success" /> : <Play className="h-4 w-4 text-muted-foreground" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-card-foreground truncate">{v.title}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{v.module}</span>
                  <span>•</span>
                  <Clock className="h-3 w-3" />
                  <span>{v.duration}</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Video Player / Quiz */}
      <div className="lg:col-span-2">
        {selectedVideo ? (
          <div className="bg-card rounded-lg border border-border shadow-card overflow-hidden">
            {!showQuiz ? (
              <>
                <div className="aspect-video bg-foreground/5 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3 cursor-pointer hover:bg-primary/30 transition-colors">
                      <Play className="h-8 w-8 text-primary ml-1" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {videos.find((v) => v.id === selectedVideo)?.title}
                    </p>
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-display font-semibold text-card-foreground">
                      {videos.find((v) => v.id === selectedVideo)?.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {videos.find((v) => v.id === selectedVideo)?.module}
                    </p>
                  </div>
                  <Button onClick={() => setShowQuiz(true)} className="bg-gradient-primary border-0 text-primary-foreground gap-2">
                    Take Quiz <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="p-6">
                <h3 className="font-display font-semibold text-lg mb-6 text-card-foreground">Video Quiz</h3>
                <div className="space-y-6">
                  {mcqQuestions.map((q, qi) => (
                    <div key={qi} className="bg-muted/50 rounded-lg p-5">
                      <p className="font-medium mb-3 text-card-foreground">
                        {qi + 1}. {q.question}
                      </p>
                      <div className="space-y-2">
                        {q.options.map((opt, oi) => (
                          <button
                            key={oi}
                            onClick={() => !submitted && setAnswers({ ...answers, [qi]: oi })}
                            className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                              submitted
                                ? oi === q.correct
                                  ? "border-success bg-success/10 text-success"
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
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex gap-3">
                  {!submitted ? (
                    <Button
                      onClick={() => setSubmitted(true)}
                      disabled={Object.keys(answers).length < mcqQuestions.length}
                      className="bg-gradient-primary border-0 text-primary-foreground"
                    >
                      Submit Answers
                    </Button>
                  ) : (
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-medium text-card-foreground">
                        Score: {mcqQuestions.filter((q, i) => answers[i] === q.correct).length}/{mcqQuestions.length}
                      </p>
                      <Button variant="outline" onClick={() => { setShowQuiz(false); setAnswers({}); setSubmitted(false); }}>
                        Back to Video
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border p-12 text-center shadow-card">
            <Play className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-display font-semibold text-lg mb-2 text-card-foreground">Select a Video</h3>
            <p className="text-sm text-muted-foreground">Choose a lesson from the list to start watching</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoLearning;
