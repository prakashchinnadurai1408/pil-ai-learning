import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "./theme";

export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const t = frame / durationInFrames;
  const hue = interpolate(t, [0, 1], [0, 30]);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(1200px 800px at ${20 + t * 60}% ${30 + Math.sin(t * 6) * 20}%, ${COLORS.primaryGlow}40, transparent 60%), radial-gradient(1000px 700px at ${80 - t * 50}% ${70}%, ${COLORS.accent}30, transparent 60%), linear-gradient(135deg, ${COLORS.bg}, ${COLORS.bgAlt})`,
        filter: `hue-rotate(${hue}deg)`,
      }}
    />
  );
};

// Re-usable browser frame chrome
export const BrowserFrame: React.FC<{ url: string; children: React.ReactNode }> = ({ url, children }) => (
  <div
    style={{
      width: "85%",
      height: "82%",
      background: "#0F172A",
      borderRadius: 18,
      overflow: "hidden",
      boxShadow: "0 40px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)",
      display: "flex",
      flexDirection: "column",
    }}
  >
    <div style={{ height: 42, background: "#1E293B", display: "flex", alignItems: "center", padding: "0 16px", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ width: 12, height: 12, borderRadius: 6, background: "#EF4444" }} />
      <div style={{ width: 12, height: 12, borderRadius: 6, background: "#F59E0B" }} />
      <div style={{ width: 12, height: 12, borderRadius: 6, background: "#10B981" }} />
      <div style={{ flex: 1, marginLeft: 16, height: 22, background: "#0F172A", borderRadius: 6, display: "flex", alignItems: "center", padding: "0 12px", color: COLORS.textDim, fontSize: 12, fontFamily: "system-ui" }}>
        🔒 {url}
      </div>
    </div>
    <div style={{ flex: 1, position: "relative", overflow: "hidden", background: COLORS.bg }}>{children}</div>
  </div>
);

export const Caption: React.FC<{ text: string; sub?: string }> = ({ text, sub }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12, 130, 145], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  const y = interpolate(frame, [0, 18], [20, 0], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        bottom: 60,
        left: "50%",
        transform: `translate(-50%, ${y}px)`,
        opacity,
        textAlign: "center",
        zIndex: 10,
      }}
    >
      <div style={{ fontFamily: "Space Grotesk, system-ui", fontSize: 44, fontWeight: 700, color: COLORS.text, letterSpacing: -1 }}>{text}</div>
      {sub && <div style={{ fontFamily: "Inter, system-ui", fontSize: 20, color: COLORS.textDim, marginTop: 8 }}>{sub}</div>}
    </div>
  );
};

export const Cursor: React.FC<{ from: { x: number; y: number }; to: { x: number; y: number }; startFrame: number; duration?: number; click?: boolean }> = ({ from, to, startFrame, duration = 25, click = true }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [startFrame, startFrame + duration], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  const x = from.x + (to.x - from.x) * ease;
  const y = from.y + (to.y - from.y) * ease;
  const clickFrame = startFrame + duration;
  const ringScale = click ? interpolate(frame, [clickFrame, clickFrame + 14], [0, 2.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  const ringOpacity = click ? interpolate(frame, [clickFrame, clickFrame + 14], [0.7, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  return (
    <>
      {ringScale > 0 && (
        <div style={{ position: "absolute", left: x - 20, top: y - 20, width: 40, height: 40, borderRadius: 20, border: `2px solid ${COLORS.accent}`, transform: `scale(${ringScale})`, opacity: ringOpacity, pointerEvents: "none", zIndex: 50 }} />
      )}
      <svg width="28" height="28" viewBox="0 0 28 28" style={{ position: "absolute", left: x, top: y, zIndex: 51, filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))" }}>
        <path d="M5 3 L5 22 L10 17 L13 24 L16 23 L13 16 L20 16 Z" fill="#fff" stroke="#000" strokeWidth="1.2" />
      </svg>
    </>
  );
};
