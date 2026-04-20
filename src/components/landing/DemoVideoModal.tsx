import { motion, AnimatePresence } from "framer-motion";
import {
  X, Play, Pause, Volume2, VolumeX, Sparkles, BookOpen, Bot,
  ClipboardCheck, FolderKanban, BarChart3, Rocket, Code2,
  MessageSquare, Video, Trophy, Users, FileCheck, GraduationCap,
  Cpu, Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import airaAvatar from "@/assets/aira-avatar.png";

interface DemoVideoModalProps {
  onClose: () => void;
}

interface ScreenChip {
  icon: LucideIcon;
  label: string;
}

interface Script {
  title: string;
  text: string;
  icon: LucideIcon;
  gradient: string; // tailwind gradient classes
  chips: ScreenChip[];
}

const SCRIPT: Script[] = [
  {
    title: "Welcome to Pluginlive AI Learning",
    text: "Hi! I'm Aira, your AI guide. Welcome to Pluginlive — an AI-powered learning platform built for UG and PG students.",
    icon: Sparkles,
    gradient: "from-primary via-primary/80 to-accent",
    chips: [
      { icon: GraduationCap, label: "UG & PG Students" },
      { icon: Bot, label: "AI-Powered" },
      { icon: Rocket, label: "Career Ready" },
    ],
  },
  {
    title: "Structured Learning Modules",
    text: "Learn through 10 plus structured modules covering Prompt Engineering, AI Agents, Large Language Models, Retrieval Augmented Generation, and more — each with videos and rich section content.",
    icon: BookOpen,
    gradient: "from-blue-500 via-indigo-500 to-primary",
    chips: [
      { icon: Layers, label: "10+ Modules" },
      { icon: Video, label: "50+ Videos" },
      { icon: Cpu, label: "LLMs · RAG · Agents" },
    ],
  },
  {
    title: "AI Coach & Playground",
    text: "Practice with an AI Coach that gives personalized guidance, and explore the AI Playground and Tools Sandbox to experiment with image generation, code generation, and prompt engineering.",
    icon: Bot,
    gradient: "from-violet-500 via-purple-500 to-fuchsia-500",
    chips: [
      { icon: MessageSquare, label: "AI Coach" },
      { icon: Sparkles, label: "Playground" },
      { icon: Code2, label: "Tools Sandbox" },
    ],
  },
  {
    title: "Assessments & Coding",
    text: "Take adaptive assessments with M C Q, descriptive and coding questions, and solve over 200 programming challenges across 40 plus languages — all with built-in proctoring.",
    icon: ClipboardCheck,
    gradient: "from-orange-500 via-amber-500 to-yellow-500",
    chips: [
      { icon: Trophy, label: "200+ Challenges" },
      { icon: Code2, label: "40+ Languages" },
      { icon: FileCheck, label: "Proctored" },
    ],
  },
  {
    title: "Academic Projects",
    text: "Get a complete college academic project guide with a 10-step lifecycle for both Tech and Non-Tech streams, including trainer reviews and threaded feedback.",
    icon: FolderKanban,
    gradient: "from-teal-500 via-emerald-500 to-green-500",
    chips: [
      { icon: Layers, label: "10-Step Lifecycle" },
      { icon: Users, label: "Trainer Reviews" },
      { icon: MessageSquare, label: "Threaded Feedback" },
    ],
  },
  {
    title: "For Trainers",
    text: "Trainers get a powerful dashboard to manage cohorts, create assessments, review projects, send bulk messages, and track real-time analytics for every student.",
    icon: BarChart3,
    gradient: "from-pink-500 via-rose-500 to-red-500",
    chips: [
      { icon: Users, label: "Cohort Manager" },
      { icon: BarChart3, label: "Live Analytics" },
      { icon: MessageSquare, label: "Bulk Messaging" },
    ],
  },
  {
    title: "Start Learning Today",
    text: "Sign in as a student or trainer and begin your AI journey. Let's transform your academic journey together!",
    icon: Rocket,
    gradient: "from-primary via-accent to-primary",
    chips: [
      { icon: GraduationCap, label: "Student Login" },
      { icon: Users, label: "Trainer Login" },
      { icon: Sparkles, label: "Get Started" },
    ],
  },
];

const DemoVideoModal = ({ onClose }: DemoVideoModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [supportsTTS, setSupportsTTS] = useState(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const stepRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupportsTTS(false);
      return;
    }
    // Warm up voices
    window.speechSynthesis.getVoices();
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Pick a female English voice (prefer Indian English)
  const pickFemaleVoice = (): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;
    const score = (v: SpeechSynthesisVoice) => {
      let s = 0;
      const n = v.name.toLowerCase();
      if (v.lang?.toLowerCase().startsWith("en-in")) s += 5;
      else if (v.lang?.toLowerCase().startsWith("en")) s += 2;
      if (/female|woman|aria|jenny|samantha|zira|google.*female|priya|veena|raveena|heera/.test(n)) s += 4;
      if (/male|david|mark|fred/.test(n)) s -= 3;
      return s;
    };
    return [...voices].sort((a, b) => score(b) - score(a))[0] ?? null;
  };

  const speakStep = (idx: number) => {
    if (!supportsTTS || isMuted) {
      // Auto-advance even without speech
      const fallback = setTimeout(() => {
        if (stepRef.current === idx) advance();
      }, 4500);
      return () => clearTimeout(fallback);
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(SCRIPT[idx].text);
    const voice = pickFemaleVoice();
    if (voice) u.voice = voice;
    u.rate = 0.98;
    u.pitch = 1.05;
    u.volume = 1;
    u.onend = () => {
      if (stepRef.current === idx) advance();
    };
    u.onerror = () => {
      if (stepRef.current === idx) advance();
    };
    utteranceRef.current = u;
    window.speechSynthesis.speak(u);
  };

  const advance = () => {
    setCurrentStep((s) => {
      const next = s + 1;
      if (next >= SCRIPT.length) {
        setIsPlaying(false);
        return s;
      }
      stepRef.current = next;
      return next;
    });
  };

  // Speak whenever step changes while playing
  useEffect(() => {
    stepRef.current = currentStep;
    if (!isPlaying) return;
    const cleanup = speakStep(currentStep);
    return () => {
      if (typeof cleanup === "function") cleanup();
      window.speechSynthesis?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, isPlaying, isMuted]);

  // Auto-start on mount
  useEffect(() => {
    const t = setTimeout(() => setIsPlaying(true), 400);
    return () => clearTimeout(t);
  }, []);

  const handleClose = () => {
    window.speechSynthesis?.cancel();
    onClose();
  };

  const togglePlay = () => {
    if (isPlaying) {
      window.speechSynthesis?.cancel();
      setIsPlaying(false);
    } else {
      // If we're on the last step, restart from the beginning
      if (currentStep >= SCRIPT.length - 1) {
        window.speechSynthesis?.cancel();
        stepRef.current = 0;
        setCurrentStep(0);
      }
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    window.speechSynthesis?.cancel();
    setIsMuted((m) => !m);
  };

  const jumpTo = (idx: number) => {
    window.speechSynthesis?.cancel();
    stepRef.current = idx;
    setCurrentStep(idx);
    setIsPlaying(true);
  };

  const step = SCRIPT[currentStep];
  const isSpeaking = isPlaying && !isMuted;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/80 backdrop-blur-sm p-4"
      onClick={handleClose}
      role="dialog"
      aria-label="Platform demo with voice-over"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-4xl rounded-2xl overflow-hidden shadow-elevated bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-display font-semibold text-card-foreground">
              Platform Demo with Aira
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-card-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid md:grid-cols-[280px_1fr] gap-0">
          {/* Avatar panel */}
          <div className="relative bg-gradient-primary p-6 flex flex-col items-center justify-center min-h-[280px] md:min-h-[420px]">
            <div className="relative">
              {/* Speaking pulse rings */}
              {isSpeaking && (
                <>
                  <motion.span
                    className="absolute inset-0 rounded-full border-2 border-primary-foreground/40"
                    animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
                  />
                  <motion.span
                    className="absolute inset-0 rounded-full border-2 border-primary-foreground/30"
                    animate={{ scale: [1, 1.9], opacity: [0.5, 0] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                  />
                </>
              )}
              <motion.div
                animate={isSpeaking ? { y: [0, -4, 0] } : {}}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                className="relative w-40 h-40 rounded-full overflow-hidden border-4 border-primary-foreground/30 bg-card shadow-elevated"
              >
                <img
                  src={airaAvatar}
                  alt="Aira, your AI guide"
                  className="w-full h-full object-cover"
                />
              </motion.div>
            </div>
            <div className="mt-5 text-center">
              <div className="text-primary-foreground font-display font-bold text-lg">Aira</div>
              <div className="text-primary-foreground/80 text-xs">
                {isSpeaking ? "Speaking…" : isPlaying ? "Paused narration" : "Click play to start"}
              </div>
            </div>
          </div>

          {/* Script panel */}
          <div className="p-6 flex flex-col min-h-[280px] md:min-h-[420px]">
            <div className="flex-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="text-xs font-medium text-primary uppercase tracking-wider mb-2">
                    Step {currentStep + 1} of {SCRIPT.length}
                  </div>
                  <h3 className="text-2xl font-display font-bold text-card-foreground mb-3">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.text}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Step dots */}
            <div className="flex items-center gap-1.5 mt-6 mb-4 flex-wrap">
              {SCRIPT.map((_, i) => (
                <button
                  key={i}
                  onClick={() => jumpTo(i)}
                  aria-label={`Jump to step ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === currentStep
                      ? "w-8 bg-primary"
                      : i < currentStep
                      ? "w-4 bg-primary/60"
                      : "w-4 bg-border hover:bg-primary/30"
                  }`}
                />
              ))}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={togglePlay}
                  className="gap-1.5"
                  aria-label={isPlaying ? "Pause narration" : "Play narration"}
                >
                  {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {isPlaying ? "Pause" : currentStep >= SCRIPT.length - 1 ? "Replay" : "Play"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={toggleMute}
                  className="gap-1.5"
                  aria-label={isMuted ? "Unmute" : "Mute"}
                  disabled={!supportsTTS}
                >
                  {isMuted || !supportsTTS ? (
                    <VolumeX className="h-3.5 w-3.5" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
              {!supportsTTS && (
                <span className="text-[11px] text-muted-foreground">
                  Voice-over not supported in this browser
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DemoVideoModal;
