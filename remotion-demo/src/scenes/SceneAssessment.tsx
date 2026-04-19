import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { BrowserFrame, Caption } from "../components";
import { COLORS } from "../theme";

const Doc: React.FC<{ name: string; type: string; status: "uploaded" | "uploading" | "pending"; progress?: number; delay: number }> = ({ name, type, status, progress = 0, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 18 } });
  return (
    <div style={{ padding: 16, background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, marginBottom: 10, display: "flex", alignItems: "center", gap: 14, opacity: s, transform: `translateY(${(1 - s) * 10}px)` }}>
      <div style={{ width: 44, height: 44, borderRadius: 8, background: status === "uploaded" ? `${COLORS.accent}30` : `${COLORS.primary}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{type === "pdf" ? "📄" : "📊"}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "Inter", fontSize: 14, color: COLORS.text, fontWeight: 600 }}>{name}</div>
        {status === "uploading" ? (
          <div style={{ height: 4, background: "rgba(0,0,0,0.3)", borderRadius: 2, marginTop: 6, overflow: "hidden" }}>
            <div style={{ width: `${progress}%`, height: "100%", background: COLORS.primary }} />
          </div>
        ) : (
          <div style={{ fontFamily: "Inter", fontSize: 11, color: status === "uploaded" ? COLORS.accent : COLORS.textDim, marginTop: 3 }}>{status === "uploaded" ? "✓ Uploaded · Reviewed" : "Pending submission"}</div>
        )}
      </div>
      {status === "uploaded" && <div style={{ color: COLORS.accent, fontSize: 18 }}>✓</div>}
    </div>
  );
};

export const SceneAssessment: React.FC = () => {
  const frame = useCurrentFrame();
  const uploadProg = interpolate(frame, [40, 110], [0, 100], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <BrowserFrame url="aiupskillhub.com/projects/ai-chatbot">
        <div style={{ padding: 36, height: "100%", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                <div style={{ padding: "4px 10px", background: `${COLORS.primary}30`, color: COLORS.primary, borderRadius: 6, fontSize: 11, fontFamily: "Inter", fontWeight: 700 }}>📁 PROJECT</div>
                <div style={{ padding: "4px 10px", background: `${COLORS.warn}30`, color: COLORS.warn, borderRadius: 6, fontSize: 11, fontFamily: "Inter", fontWeight: 700 }}>STEP 4 / 10</div>
              </div>
              <div style={{ fontFamily: "Space Grotesk", fontSize: 26, fontWeight: 700, color: COLORS.text }}>Build an AI Customer Support Bot</div>
              <div style={{ fontFamily: "Inter", fontSize: 13, color: COLORS.textDim, marginTop: 4 }}>Submit System Design & Tech Stack documents</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "Space Grotesk", fontSize: 28, fontWeight: 700, color: COLORS.accent }}>40%</div>
              <div style={{ fontFamily: "Inter", fontSize: 11, color: COLORS.textDim }}>Complete</div>
            </div>
          </div>
          <div style={{ height: 8, background: "rgba(0,0,0,0.3)", borderRadius: 4, overflow: "hidden", marginBottom: 28 }}>
            <div style={{ width: "40%", height: "100%", background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.accent})` }} />
          </div>
          <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Submissions</div>
          <Doc name="Problem Statement.pdf" type="pdf" status="uploaded" delay={10} />
          <Doc name="Requirements_Spec.pdf" type="pdf" status="uploaded" delay={20} />
          <Doc name="System_Architecture.pdf" type="pdf" status="uploading" progress={uploadProg} delay={30} />
          <Doc name="Tech_Stack.pdf" type="pdf" status="pending" delay={40} />
        </div>
      </BrowserFrame>
      <Caption text="Real-world projects" sub="10-step lifecycle with trainer feedback" />
    </AbsoluteFill>
  );
};
