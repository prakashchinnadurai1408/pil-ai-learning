import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { BrowserFrame, Caption } from "../components";
import { COLORS } from "../theme";

const SidebarItem: React.FC<{ label: string; icon: string; active?: boolean; delay: number }> = ({ label, icon, active, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = spring({ frame: frame - delay, fps, config: { damping: 20 } });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, background: active ? `${COLORS.primary}30` : "transparent", color: active ? COLORS.text : COLORS.textDim, fontFamily: "Inter", fontSize: 14, opacity: op, transform: `translateX(${(1 - op) * -20}px)` }}>
      <span style={{ fontSize: 16 }}>{icon}</span>{label}
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string; delay: number; color: string }> = ({ label, value, delay, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 130 } });
  return (
    <div style={{ flex: 1, padding: 20, background: COLORS.card, borderRadius: 14, border: `1px solid ${COLORS.border}`, transform: `scale(${s})`, opacity: s }}>
      <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.textDim, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: "Space Grotesk", fontSize: 32, fontWeight: 700, color }}>{value}</div>
    </div>
  );
};

export const SceneDashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [60, 110], [0, 64], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <BrowserFrame url="aiupskillhub.com/dashboard">
        <div style={{ display: "flex", height: "100%" }}>
          <div style={{ width: 220, background: "rgba(0,0,0,0.3)", padding: 16, borderRight: `1px solid ${COLORS.border}` }}>
            <div style={{ fontFamily: "Space Grotesk", fontSize: 18, fontWeight: 700, background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`, WebkitBackgroundClip: "text", color: "transparent", marginBottom: 24 }}>AI Upskill Hub</div>
            <div style={{ fontSize: 10, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: 1.5, padding: "0 14px 8px" }}>Learn</div>
            <SidebarItem label="Modules" icon="📚" active delay={5} />
            <div style={{ fontSize: 10, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: 1.5, padding: "16px 14px 8px" }}>Practice</div>
            <SidebarItem label="AI Chat" icon="💬" delay={10} />
            <SidebarItem label="Coding" icon="💻" delay={15} />
            <SidebarItem label="Prompts" icon="✏️" delay={20} />
            <SidebarItem label="AI Tools" icon="🧪" delay={25} />
            <div style={{ fontSize: 10, color: COLORS.textDim, textTransform: "uppercase", letterSpacing: 1.5, padding: "16px 14px 8px" }}>Progress</div>
            <SidebarItem label="Assessments" icon="📋" delay={30} />
            <SidebarItem label="Projects" icon="📁" delay={35} />
          </div>
          <div style={{ flex: 1, padding: 32, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <div style={{ fontFamily: "Space Grotesk", fontSize: 28, fontWeight: 700, color: COLORS.text }}>Welcome, Priya 👋</div>
                <div style={{ fontFamily: "Inter", fontSize: 14, color: COLORS.textDim, marginTop: 4 }}>Your AI learning journey continues</div>
              </div>
              <div style={{ padding: "6px 14px", background: `${COLORS.warn}20`, color: COLORS.warn, borderRadius: 20, fontFamily: "Inter", fontSize: 12, fontWeight: 600 }}>⭐ Premium</div>
            </div>
            <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
              <StatCard label="Overall Progress" value={`${Math.round(progress)}%`} delay={20} color={COLORS.primary} />
              <StatCard label="Modules Done" value="6/10" delay={30} color={COLORS.accent} />
              <StatCard label="Quiz Score" value="84%" delay={40} color={COLORS.warn} />
              <StatCard label="Streak" value="12 🔥" delay={50} color="#EC4899" />
            </div>
            <div style={{ padding: 24, background: COLORS.card, borderRadius: 16, border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontFamily: "Inter", fontSize: 14, color: COLORS.textDim, marginBottom: 10 }}>Course progress</div>
              <div style={{ height: 12, background: "rgba(0,0,0,0.3)", borderRadius: 6, overflow: "hidden" }}>
                <div style={{ width: `${progress}%`, height: "100%", background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.accent})`, transition: "none", boxShadow: `0 0 20px ${COLORS.primary}` }} />
              </div>
            </div>
          </div>
        </div>
      </BrowserFrame>
      <Caption text="Personalized dashboard" sub="Track progress, modules and streaks" />
    </AbsoluteFill>
  );
};
