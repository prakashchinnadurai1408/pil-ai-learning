import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe } from "lucide-react";

export const LANGUAGES = [
  { code: "en-IN", label: "English (India)", aiLabel: "Indian English" },
  { code: "hi-IN", label: "हिन्दी (Hindi)", aiLabel: "Hindi" },
  { code: "bn-IN", label: "বাংলা (Bengali)", aiLabel: "Bengali" },
  { code: "ta-IN", label: "தமிழ் (Tamil)", aiLabel: "Tamil" },
  { code: "te-IN", label: "తెలుగు (Telugu)", aiLabel: "Telugu" },
  { code: "mr-IN", label: "मराठी (Marathi)", aiLabel: "Marathi" },
  { code: "gu-IN", label: "ગુજરાતી (Gujarati)", aiLabel: "Gujarati" },
  { code: "kn-IN", label: "ಕನ್ನಡ (Kannada)", aiLabel: "Kannada" },
  { code: "ml-IN", label: "മലയാളം (Malayalam)", aiLabel: "Malayalam" },
  { code: "pa-IN", label: "ਪੰਜਾਬੀ (Punjabi)", aiLabel: "Punjabi" },
  { code: "or-IN", label: "ଓଡ଼ିଆ (Odia)", aiLabel: "Odia" },
  { code: "as-IN", label: "অসমীয়া (Assamese)", aiLabel: "Assamese" },
  { code: "ur-IN", label: "اردو (Urdu)", aiLabel: "Urdu" },
] as const;

export type LanguageCode = typeof LANGUAGES[number]["code"];

interface Props {
  value: LanguageCode;
  onChange: (v: LanguageCode) => void;
}

const ChatLanguageSelector = ({ value, onChange }: Props) => (
  <div className="flex items-center gap-2">
    <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    <Select value={value} onValueChange={(v) => onChange(v as LanguageCode)}>
      <SelectTrigger className="h-8 w-[180px] text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LANGUAGES.map((l) => (
          <SelectItem key={l.code} value={l.code} className="text-xs">
            {l.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

export default ChatLanguageSelector;
