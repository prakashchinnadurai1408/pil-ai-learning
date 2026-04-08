import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";
import type { LanguageCode } from "./ChatLanguageSelector";

interface Props {
  text: string;
  lang: LanguageCode;
}

const ChatVoiceButton = ({ text, lang }: Props) => {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    return () => speechSynthesis.cancel();
  }, []);

  const toggle = useCallback(() => {
    if (speaking) {
      speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    // Strip markdown for cleaner speech
    const clean = text
      .replace(/```[\s\S]*?```/g, "code block")
      .replace(/[*_#>`~\[\]()]/g, "")
      .replace(/\n+/g, ". ");

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = lang;
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    // Try to find a matching voice
    const voices = speechSynthesis.getVoices();
    const match = voices.find((v) => v.lang === lang) || voices.find((v) => v.lang.startsWith(lang.split("-")[0]));
    if (match) utterance.voice = match;

    speechSynthesis.speak(utterance);
    setSpeaking(true);
  }, [text, lang, speaking]);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-6 w-6 mt-1"
      onClick={toggle}
      aria-label={speaking ? "Stop speaking" : "Read aloud"}
    >
      {speaking ? (
        <VolumeX className="h-3.5 w-3.5 text-destructive" />
      ) : (
        <Volume2 className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
      )}
    </Button>
  );
};

export default ChatVoiceButton;
