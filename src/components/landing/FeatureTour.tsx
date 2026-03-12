import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  X, ChevronLeft, ChevronRight, BookOpen, MessageSquare,
  Video, FlaskConical, Trophy, Pause, Play
} from "lucide-react";

import tourModules from "@/assets/tour-modules.jpg";
import tourAiChat from "@/assets/tour-aichat.jpg";
import tourVideos from "@/assets/tour-videos.jpg";
import tourQuiz from "@/assets/tour-quiz.jpg";
import tourTools from "@/assets/tour-tools.jpg";

const slides = [
  {
    id: 1,
    image: tourModules,
    icon: BookOpen,
    title: "10 Structured AI Modules",
    description: "From AI fundamentals to SaaS development — each module includes lessons, activities, and hands-on exercises designed for UG/PG students.",
    accent: "from-primary to-blue-600",
  },
  {
    id: 2,
    image: tourAiChat,
    icon: MessageSquare,
    title: "AI Chat Playground",
    description: "Practice prompt engineering with a real AI assistant. Get instant responses, explore different prompting techniques, and learn by doing.",
    accent: "from-accent to-primary",
  },
  {
    id: 3,
    image: tourVideos,
    icon: Video,
    title: "50+ Video Lessons",
    description: "Curated video lessons for every module with built-in quizzes. Track your viewing progress and test comprehension as you learn.",
    accent: "from-teal-500 to-primary",
  },
  {
    id: 4,
    image: tourQuiz,
    icon: Trophy,
    title: "Interactive Assessments",
    description: "End-of-module quizzes with instant feedback, explanations, and score tracking. Earn completion badges as you master each topic.",
    accent: "from-warning to-orange-500",
  },
  {
    id: 5,
    image: tourTools,
    icon: FlaskConical,
    title: "AI Tools Sandbox",
    description: "Experiment with real AI tools — text summarizer, code generator, concept explainer, and quiz generator — all powered by live AI.",
    accent: "from-green-500 to-teal-500",
  },
];

const AUTO_INTERVAL = 5000;

interface FeatureTourProps {
  onClose: () => void;
}

const FeatureTour = ({ onClose }: FeatureTourProps) => {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [direction, setDirection] = useState(1);

  const goTo = useCallback((index: number) => {
    setDirection(index > current ? 1 : -1);
    setCurrent(index);
  }, [current]);

  const next = useCallback(() => {
    setDirection(1);
    setCurrent((c) => (c + 1) % slides.length);
  }, []);

  const prev = useCallback(() => {
    setDirection(-1);
    setCurrent((c) => (c - 1 + slides.length) % slides.length);
  }, []);

  // Auto-advance
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(next, AUTO_INTERVAL);
    return () => clearInterval(timer);
  }, [isPaused, next]);

  // Keyboard nav
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === " ") { e.preventDefault(); setIsPaused((p) => !p); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, next, prev]);

  const slide = slides[current];
  const Icon = slide.icon;
  const progress = ((current + 1) / slides.length) * 100;

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0, scale: 0.95 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0, scale: 0.95 }),
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-4xl rounded-2xl overflow-hidden shadow-elevated bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${slide.accent} flex items-center justify-center`}>
              <Icon className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-display font-semibold text-card-foreground">
              AI LearnHub — Feature Tour
            </span>
            <span className="text-xs text-muted-foreground ml-2">
              {current + 1} / {slides.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPaused(!isPaused)}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-card-foreground"
              aria-label={isPaused ? "Play" : "Pause"}
            >
              {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-card-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-0">
          <Progress value={progress} className="h-1 rounded-none" />
        </div>

        {/* Slide content */}
        <div className="relative overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={slide.id}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              {/* Image */}
              <div className="aspect-[16/9] bg-muted relative overflow-hidden">
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="w-full h-full object-cover"
                />
                {/* Gradient overlay at bottom */}
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-card to-transparent" />
              </div>

              {/* Text content */}
              <div className="px-6 pb-5 -mt-16 relative z-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${slide.accent} flex items-center justify-center shadow-lg`}>
                    <Icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <h3 className="font-display font-bold text-xl text-card-foreground">
                    {slide.title}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground ml-[52px] max-w-lg">
                  {slide.description}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Nav arrows */}
          <button
            onClick={prev}
            className="absolute left-3 top-1/3 -translate-y-1/2 w-9 h-9 rounded-full bg-card/80 backdrop-blur-sm border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/3 -translate-y-1/2 w-9 h-9 rounded-full bg-card/80 backdrop-blur-sm border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Dot navigation */}
        <div className="flex items-center justify-center gap-2 pb-4">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all ${
                i === current
                  ? "w-6 h-2 bg-primary"
                  : "w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default FeatureTour;
