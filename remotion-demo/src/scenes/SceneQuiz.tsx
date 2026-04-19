import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { BrowserFrame, Caption } from "../components";
import { COLORS } from "../theme";

const Option: React.FC<{ letter: string; text: string; correct?: boolean; selected?: boolean; revealAt: number; delay: number }> = ({ letter, text, correct, selected, revealAt, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 18 } });
  const showResult = frame > revealAt;
  const bg = showResult && correct ? `${COLORS.accent}25` : selected ? `${COLORS.primary}25` : COLORS.card;
  const border = showResult && correct ? COLORS.accent : selected ? COLORS.primary : COLORS.border;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, background: bg, border: `2px solid ${border}`, borderRadius: 12, marginBottom: 10, opacity: s, transform: `translateX(${(1 - s) * 20}px)` }}>
      <div style={{ width: 32, height: 32, borderRadius: 16, background: COLORS.bg, border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.text, fontFamily: "Space Grotesk", fontWeight: 700, fontSize: 14 }}>{letter}</div>
      <div style={{ flex: 1, fontFamily: "Inter", fontSize: 16, color: COLORS.text }}>{text}</div>
      {showResult && correct && <div style={{ color: COLORS.accent, fontSize: 22 }}>✓</div>}
    </div>
  );
};

export const SceneQuiz: React.FC = () => {
  const frame = useCurrentFrame();
  const titleS = spring({ frame, fps: 30, config: { damping: 18 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <BrowserFrame url="aiupskillhub.com/quiz">
        <div style={{ padding: 50, height: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: "100%", maxWidth: 760, opacity: titleS }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontFamily: "Inter", fontSize: 13, color: COLORS.textDim }}>
              <span>Question 3 of 5</span>
              <span>⏱ 02:14</span>
            </div>
            <div style={{ height: 6, background: "rgba(0,0,0,0.3)", borderRadius: 3, overflow: "hidden", marginBottom: 24 }}>
              <div style={{ width: "60%", height: "100%", background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.accent})` }} />
            </div>
            <div style={{ fontFamily: "Space Grotesk", fontSize: 26, fontWeight: 600, color: COLORS.text, marginBottom: 28, lineHeight: 1.4 }}>
              Which technique gives an LLM step-by-step reasoning ability?
            </div>
            <Option letter="A" text="Zero-shot prompting" delay={20} revealAt={120} />
            <Option letter="B" text="Chain-of-thought prompting" correct selected delay={28} revealAt={120} />
            <Option letter="C" text="Token truncation" delay={36} revealAt={120} />
            <Option letter="D" text="Temperature = 0" delay={44} revealAt={120} />
          </div>
        </div>
      </BrowserFrame>
      <Caption text="Practice quizzes" sub="Instant feedback with explanations" />
    </AbsoluteFill>
  );
};
