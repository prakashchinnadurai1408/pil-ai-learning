import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";
import type { LanguageCode } from "./ChatLanguageSelector";

type SpeechRecognitionType = typeof window extends { SpeechRecognition: infer T } ? T : any;

const getSpeechRecognition = (): (new () => any) | null => {
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
};

interface Props {
  lang: LanguageCode;
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

const ChatVoiceInput = ({ lang, onTranscript, disabled }: Props) => {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const toggle = useCallback(() => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const SR = getSpeechRecognition();
    if (!SR) return;

    const recognition = new SR();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0]?.[0]?.transcript;
      if (transcript) onTranscript(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [listening, lang, onTranscript]);

  // Hide if browser doesn't support Speech Recognition
  if (typeof window !== "undefined" && !getSpeechRecognition()) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggle}
      disabled={disabled}
      className={listening ? "border-destructive text-destructive animate-pulse" : ""}
      aria-label={listening ? "Stop listening" : "Speak your question"}
    >
      {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
};

export default ChatVoiceInput;
