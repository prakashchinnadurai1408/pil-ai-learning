import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { BrowserFrame, Caption } from "../components";
import { COLORS } from "../theme";

const Bubble: React.FC<{ from: "user" | "ai"; text: string; delay: number; reveal?: boolean }> = ({ from, text, delay, reveal }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 18 } });
  const len = reveal ? Math.floor(interpolate(frame - delay, [10, 60], [0, text.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })) : text.length;
  const shown = text.slice(0, len);
  return (
    <div style={{ display: "flex", justifyContent: from === "user" ? "flex-end" : "flex-start", marginBottom: 14, opacity: s, transform: `translateY(${(1 - s) * 10}px)` }}>
      {from === "ai" && <div style={{ width: 36, height: 36, borderRadius: 18, background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryGlow})`, marginRight: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>✨</div>}
      <div style={{ maxWidth: "70%", padding: "12px 16px", borderRadius: 16, background: from === "user" ? `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryGlow})` : COLORS.card, border: from === "ai" ? `1px solid ${COLORS.border}` : "none", color: COLORS.text, fontFamily: "Inter", fontSize: 15, lineHeight: 1.5 }}>{shown}{reveal && len < text.length && <span style={{ opacity: frame % 20 < 10 ? 1 : 0 }}>▍</span>}</div>
    </div>
  );
};

export const SceneAICoach: React.FC = () => {
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <BrowserFrame url="aiupskillhub.com/ai-chat">
        <div style={{ height: "100%", padding: 30, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 24, background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, boxShadow: `0 0 24px ${COLORS.primary}` }}>✨</div>
            <div>
              <div style={{ fontFamily: "Space Grotesk", fontSize: 20, fontWeight: 700, color: COLORS.text }}>Aira · AI Coach</div>
              <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.accent, display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 8, height: 8, borderRadius: 4, background: COLORS.accent }} />Online</div>
            </div>
          </div>
          <div style={{ flex: 1, overflow: "hidden", padding: "10px 0" }}>
            <Bubble from="user" text="I'm stuck on chain-of-thought. Can you explain with an example?" delay={5} />
            <Bubble from="ai" text="Of course! Chain-of-thought lets the model reason step by step. For example, instead of just asking 'What's 23 × 47?', you'd say 'Think step by step…' — the model breaks it down: 23 × 40 = 920, 23 × 7 = 161, total 1081. Want a coding example next?" delay={40} reveal />
          </div>
          <div style={{ height: 56, background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, display: "flex", alignItems: "center", padding: "0 16px", gap: 12 }}>
            <div style={{ flex: 1, color: COLORS.textDim, fontFamily: "Inter", fontSize: 14 }}>Ask Aira anything…</div>
            <div style={{ width: 40, height: 40, borderRadius: 20, background: COLORS.primary, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>↑</div>
          </div>
        </div>
      </BrowserFrame>
      <Caption text="Aira, your AI coach" sub="24/7 personalized help in 13 languages" />
    </AbsoluteFill>
  );
};
