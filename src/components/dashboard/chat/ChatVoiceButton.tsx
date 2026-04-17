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

  const pickIndianVoice = useCallback((targetLang: string) => {
    const voices = speechSynthesis.getVoices();
    if (!voices.length) return null;

    const baseLang = targetLang.split("-")[0];
    const indianExact = voices.filter((v) => v.lang === targetLang);
    const indianBase = voices.filter(
      (v) => v.lang.toLowerCase().endsWith("-in") && v.lang.startsWith(baseLang)
    );

    // Prefer male-sounding Indian voices to match Prakash persona
    const maleKeywords = ["ravi", "prabhat", "hemant", "kabir", "rishi", "male"];
    const pickMale = (list: SpeechSynthesisVoice[]) =>
      list.find((v) => maleKeywords.some((kw) => v.name.toLowerCase().includes(kw)));

    return (
      pickMale(indianExact) ||
      pickMale(indianBase) ||
      indianExact[0] ||
      indianBase[0] ||
      voices.find((v) => v.lang.startsWith(baseLang)) ||
      null
    );
  }, []);

  const toggle = useCallback(() => {
    if (speaking) {
      speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    const clean = text
      .replace(/```[\s\S]*?```/g, "code block")
      .replace(/[*_#>`~\[\]()]/g, "")
      .replace(/\n+/g, ". ");

    const speak = () => {
      const utterance = new SpeechSynthesisUtterance(clean);
      // Force Indian English locale for any en-* selection so Prakash sounds Indian
      utterance.lang = lang.startsWith("en") ? "en-IN" : lang;
      utterance.rate = 0.95;
      utterance.pitch = 0.95; // slightly lower for male tone
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      const match = pickIndianVoice(utterance.lang);
      if (match) utterance.voice = match;

      speechSynthesis.speak(utterance);
      setSpeaking(true);
    };

    if (!speechSynthesis.getVoices().length) {
      speechSynthesis.addEventListener("voiceschanged", speak, { once: true });
    } else {
      speak();
    }
  }, [text, lang, speaking, pickIndianVoice]);

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
