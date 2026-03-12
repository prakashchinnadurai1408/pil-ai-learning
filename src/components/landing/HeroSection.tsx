import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Play, Sparkles, X } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  const [showDemo, setShowDemo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleWatchDemo = () => {
    setShowDemo(true);
  };

  const handleCloseDemo = () => {
    setShowDemo(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <>
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/90 via-foreground/70 to-foreground/40" />

        <div className="container mx-auto px-6 relative z-10 pt-24">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 mb-6"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                AI-Powered Learning for UG / PG Students
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-tight mb-6"
              style={{ color: "hsl(0, 0%, 95%)" }}
            >
              Master AI Tools &{" "}
              <span className="text-gradient-primary">Transform</span> Your
              Academic Journey
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg mb-8 max-w-lg"
              style={{ color: "hsl(220, 15%, 70%)" }}
            >
              10 structured modules covering Prompt Engineering, AI Agents, LLMs,
              RAG, and more. Practice with real AI tools, complete assessments, and
              become AI-ready.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4"
            >
              <Link to="/student-login" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto gap-2 bg-gradient-primary border-0 text-primary-foreground hover:opacity-90 text-base px-8"
                >
                  Start Learning <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto gap-2 text-base border-primary/30 hover:bg-primary/10"
                style={{ color: "hsl(0, 0%, 90%)" }}
                onClick={handleWatchDemo}
              >
                <Play className="h-4 w-4" /> Watch Demo
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-12 flex items-center gap-8 text-sm"
              style={{ color: "hsl(220, 15%, 60%)" }}
            >
              <div>
                <span className="text-2xl font-bold text-primary">10+</span>
                <p>AI Modules</p>
              </div>
              <div className="w-px h-10 bg-primary/20" />
              <div>
                <span className="text-2xl font-bold text-primary">50+</span>
                <p>Video Lessons</p>
              </div>
              <div className="w-px h-10 bg-primary/20" />
              <div>
                <span className="text-2xl font-bold text-primary">100+</span>
                <p>Practice Tasks</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Demo Video Modal */}
      <AnimatePresence>
        {showDemo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/80 backdrop-blur-sm p-4"
            onClick={handleCloseDemo}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-4xl rounded-xl overflow-hidden shadow-elevated bg-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
                <div className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-primary" />
                  <span className="text-sm font-display font-semibold text-card-foreground">
                    AI LearnHub — Quick Demo
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseDemo}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-card-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="aspect-video bg-foreground/5">
                <video
                  ref={videoRef}
                  src="/demo-video.mp4"
                  autoPlay
                  muted
                  playsInline
                  controls
                  className="w-full h-full object-cover"
                  onEnded={handleCloseDemo}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default HeroSection;
