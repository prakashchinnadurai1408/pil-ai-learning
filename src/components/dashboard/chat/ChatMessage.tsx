import { User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import AIFeedback from "@/components/dashboard/AIFeedback";
import ChatVoiceButton from "./ChatVoiceButton";
import aiAvatar from "@/assets/ai-avatar.png";
import type { LanguageCode } from "./ChatLanguageSelector";

type Message = { role: "user" | "assistant"; content: string };

interface Props {
  msg: Message;
  index: number;
  lang: LanguageCode;
}

const ChatMessage = ({ msg, index, lang }: Props) => (
  <div className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
    {msg.role === "assistant" && (
      <img
        src={aiAvatar}
        alt="AI Assistant"
        className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-2 ring-primary/20"
        width={32}
        height={32}
        loading="lazy"
      />
    )}
    <div
      className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${
        msg.role === "user"
          ? "bg-primary text-primary-foreground rounded-br-sm"
          : "bg-muted text-foreground rounded-bl-sm"
      }`}
    >
      {msg.role === "assistant" ? (
        <div>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {index > 0 && !msg.content.startsWith("⚠️") && (
              <>
                <ChatVoiceButton text={msg.content} lang={lang} />
                <AIFeedback messageIndex={index} />
              </>
            )}
          </div>
        </div>
      ) : (
        <span className="whitespace-pre-wrap">{msg.content}</span>
      )}
    </div>
    {msg.role === "user" && (
      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
        <User className="h-4 w-4 text-secondary-foreground" />
      </div>
    )}
  </div>
);

export default ChatMessage;
