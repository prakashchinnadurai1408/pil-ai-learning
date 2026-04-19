import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { BrowserFrame, Caption } from "../components";
import { COLORS } from "../theme";

const Topic: React.FC<{ title: string; mins: string; done: boolean; delay: number }> = ({ title, mins, done, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 18 } });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, background: COLORS.card, borderRadius: 10, border: `1px solid ${COLORS.border}`, marginBottom: 10, opacity: s, transform: `translateY(${(1 - s) * 16}px)` }}>
      <div style={{ width: 32, height: 32, borderRadius: 16, background: done ? COLORS.accent : "transparent", border: `2px solid ${done ? COLORS.accent : COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14 }}>{done ? "✓" : ""}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "Inter", fontSize: 14, color: COLORS.text, fontWeight: 600 }}>{title}</div>
        <div style={{ fontFamily: "Inter", fontSize: 11, color: COLORS.textDim, marginTop: 2 }}>📺 Video · {mins} min</div>
      </div>
    </div>
  );
};

export const SceneModule: React.FC = () => {
  const frame = useCurrentFrame();
  const videoProg = interpolate(frame, [40, 130], [0, 0.62], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <BrowserFrame url="aiupskillhub.com/modules/llms-in-practice">
        <div style={{ display: "flex", height: "100%", padding: 24, gap: 20 }}>
          <div style={{ flex: 2, display: "flex", flexDirection: "column" }}>
            <div style={{ fontFamily: "Space Grotesk", fontSize: 24, fontWeight: 700, color: COLORS.text, marginBottom: 14 }}>LLMs in Practice</div>
            <div style={{ flex: 1, background: "#000", borderRadius: 14, position: "relative", overflow: "hidden", border: `1px solid ${COLORS.border}` }}>
              <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${COLORS.primaryGlow}40, ${COLORS.bg})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 80, height: 80, borderRadius: 40, background: "rgba(255,255,255,0.95)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, color: COLORS.primary, boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>▶</div>
              </div>
              <div style={{ position: "absolute", bottom: 16, left: 16, right: 16 }}>
                <div style={{ height: 6, background: "rgba(255,255,255,0.2)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${videoProg * 100}%`, height: "100%", background: COLORS.primary }} />
                </div>
                <div style={{ fontFamily: "Inter", fontSize: 11, color: "#fff", marginTop: 6, display: "flex", justifyContent: "space-between" }}>
                  <span>{Math.floor(videoProg * 8)}:{String(Math.floor((videoProg * 8 % 1) * 60)).padStart(2, "0")}</span>
                  <span>8:00</span>
                </div>
              </div>
            </div>
          </div>
          <div style={{ flex: 1.2, overflow: "hidden" }}>
            <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Topics</div>
            <Topic title="What is an LLM?" mins="6" done delay={10} />
            <Topic title="Tokens & embeddings" mins="8" done delay={20} />
            <Topic title="Calling Gemini API" mins="10" done={false} delay={30} />
            <Topic title="Prompt patterns" mins="7" done={false} delay={40} />
            <Topic title="Hands-on lab" mins="12" done={false} delay={50} />
          </div>
        </div>
      </BrowserFrame>
      <Caption text="Watch & learn" sub="Bite-sized videos with topic tracking" />
    </AbsoluteFill>
  );
};
