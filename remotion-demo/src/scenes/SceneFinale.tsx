import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { COLORS } from "../theme";

const Confetti: React.FC<{ idx: number }> = ({ idx }) => {
  const frame = useCurrentFrame();
  const startX = (idx * 137) % 1920;
  const drift = Math.sin((frame + idx * 10) / 20) * 60;
  const y = ((frame * 6 + idx * 50) % 1300) - 100;
  const colors = [COLORS.primary, COLORS.primaryGlow, COLORS.accent, COLORS.warn, "#EC4899"];
  const c = colors[idx % colors.length];
  return <div style={{ position: "absolute", left: startX + drift, top: y, width: 10, height: 14, background: c, borderRadius: 2, transform: `rotate(${frame * 6 + idx * 30}deg)`, opacity: 0.85 }} />;
};

const Stat: React.FC<{ label: string; value: string; delay: number; color: string }> = ({ label, value, delay, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 130 } });
  return (
    <div style={{ flex: 1, padding: 24, background: "rgba(255,255,255,0.06)", border: `1px solid ${COLORS.border}`, borderRadius: 16, textAlign: "center", transform: `scale(${s})`, opacity: s, backdropFilter: "blur(20px)" }}>
      <div style={{ fontFamily: "Space Grotesk", fontSize: 44, fontWeight: 800, color, marginBottom: 6, textShadow: `0 0 30px ${color}` }}>{value}</div>
      <div style={{ fontFamily: "Inter", fontSize: 13, color: COLORS.textDim }}>{label}</div>
    </div>
  );
};

export const SceneFinale: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const badgeS = spring({ frame, fps, config: { damping: 10, stiffness: 100 } });
  const titleS = spring({ frame: frame - 18, fps, config: { damping: 16 } });
  const subS = spring({ frame: frame - 30, fps, config: { damping: 18 } });
  const ctaS = spring({ frame: frame - 100, fps, config: { damping: 14, stiffness: 120 } });
  const pulse = 1 + Math.sin(frame / 8) * 0.04;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", background: `radial-gradient(800px 600px at 50% 50%, ${COLORS.primary}40, transparent), ${COLORS.bg}` }}>
      {Array.from({ length: 50 }).map((_, i) => <Confetti key={i} idx={i} />)}
      <div style={{ textAlign: "center", zIndex: 5 }}>
        <div style={{ width: 140, height: 140, margin: "0 auto 28px", borderRadius: 70, background: `linear-gradient(135deg, ${COLORS.warn}, ${COLORS.primary})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 70, transform: `scale(${badgeS * pulse})`, boxShadow: `0 0 80px ${COLORS.warn}90, 0 20px 60px rgba(0,0,0,0.5)` }}>🏆</div>
        <div style={{ fontFamily: "Space Grotesk", fontSize: 64, fontWeight: 800, color: COLORS.text, letterSpacing: -2, opacity: titleS, transform: `translateY(${(1 - titleS) * 20}px)`, marginBottom: 12 }}>Job-Ready in Weeks</div>
        <div style={{ fontFamily: "Inter", fontSize: 22, color: COLORS.textDim, opacity: subS, marginBottom: 50 }}>Your complete AI upskilling journey</div>
        <div style={{ display: "flex", gap: 18, maxWidth: 900, margin: "0 auto" }}>
          <Stat label="Modules" value="10+" delay={45} color={COLORS.primary} />
          <Stat label="AI Languages" value="13" delay={55} color={COLORS.accent} />
          <Stat label="Coding Challenges" value="200+" delay={65} color={COLORS.warn} />
          <Stat label="Real Projects" value="∞" delay={75} color="#EC4899" />
        </div>
        <div style={{ marginTop: 48, opacity: ctaS, transform: `scale(${0.9 + ctaS * 0.1})` }}>
          <div style={{ display: "inline-block", padding: "18px 46px", background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryGlow})`, color: "#fff", borderRadius: 14, fontFamily: "Space Grotesk", fontWeight: 700, fontSize: 22, boxShadow: `0 20px 60px ${COLORS.primary}80` }}>Start Your Journey →</div>
          <div style={{ marginTop: 14, fontFamily: "Inter", fontSize: 14, color: COLORS.textDim }}>aiupskillhub.com</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
