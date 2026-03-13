import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import DemoVideoModal from "./DemoVideoModal";

const HeroSection = () => {
  const [showTour, setShowTour] = useState(false);

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
                className="w-full sm:w-auto gap-2 text-base border-destructive/40 hover:bg-destructive/10"
                onClick={() => setShowTour(true)}
              >
                <Play className="h-4 w-4 text-destructive" />
                <span className="font-bold text-destructive">Watch Demo</span>
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

      {/* Feature Tour Modal */}
      <AnimatePresence>
        {showTour && <DemoVideoModal onClose={() => setShowTour(false)} />}
      </AnimatePresence>
    </>
  );
};

export default HeroSection;
