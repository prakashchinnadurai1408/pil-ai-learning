import { motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

interface DemoVideoModalProps {
  onClose: () => void;
}

const DemoVideoModal = ({ onClose }: DemoVideoModalProps) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/80 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-label="Demo video"
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
          <span className="text-sm font-display font-semibold text-card-foreground">
            Platform Demo
          </span>
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
        <div className="aspect-video bg-foreground/5">
          <video
            src="/demo-video.mp4"
            controls
            autoPlay
            className="w-full h-full"
            aria-label="Platform demo video"
          />
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DemoVideoModal;
