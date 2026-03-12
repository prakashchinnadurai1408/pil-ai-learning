import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "sonner";

interface AIFeedbackProps {
  messageIndex: number;
}

const AIFeedback = ({ messageIndex }: AIFeedbackProps) => {
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  const handleFeedback = (type: "up" | "down") => {
    setFeedback(type);
    toast.success(type === "up" ? "Thanks for the feedback!" : "Sorry about that. We'll improve!", {
      duration: 2000,
    });
  };

  if (feedback) {
    return (
      <span className="text-[10px] text-muted-foreground/60 mt-1 block">
        {feedback === "up" ? "👍 Helpful" : "👎 Not helpful"} — Thanks!
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1 mt-1.5">
      <span className="text-[10px] text-muted-foreground/60">Was this helpful?</span>
      <button
        onClick={() => handleFeedback("up")}
        className="p-1 rounded hover:bg-muted transition-colors"
        aria-label="Mark response as helpful"
      >
        <ThumbsUp className="h-3 w-3 text-muted-foreground/50 hover:text-success" />
      </button>
      <button
        onClick={() => handleFeedback("down")}
        className="p-1 rounded hover:bg-muted transition-colors"
        aria-label="Mark response as not helpful"
      >
        <ThumbsDown className="h-3 w-3 text-muted-foreground/50 hover:text-destructive" />
      </button>
    </div>
  );
};

export default AIFeedback;
