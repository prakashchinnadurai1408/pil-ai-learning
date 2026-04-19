import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { BrowserFrame, Caption, Cursor } from "../components";
import { COLORS } from "../theme";

// Scene 1: Login as student
export const SceneLogin: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cardScale = spring({ frame, fps, config: { damping: 14, stiffness: 120 } });
  const mobileChars = "9876543210".slice(0, Math.max(0, Math.floor(interpolate(frame, [25, 55], [0, 10], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }))));
  const pwdChars = "•".repeat(Math.max(0, Math.floor(interpolate(frame, [60, 85], [0, 8], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }))));
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <BrowserFrame url="aiupskillhub.com/student-login">
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: `radial-gradient(800px 500px at 30% 30%, ${COLORS.primary}30, transparent), ${COLORS.bg}` }}>
          <div style={{ width: 440, padding: 36, background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 20, transform: `scale(${cardScale})`, backdropFilter: "blur(20px)" }}>
            <div style={{ fontFamily: "Space Grotesk, system-ui", fontSize: 28, fontWeight: 700, color: COLORS.text, marginBottom: 8 }}>Welcome back, Student</div>
            <div style={{ fontFamily: "Inter, system-ui", fontSize: 14, color: COLORS.textDim, marginBottom: 28 }}>Sign in to continue your AI journey</div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 6, fontFamily: "Inter" }}>Mobile number</div>
              <div style={{ height: 44, background: "rgba(0,0,0,0.3)", border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "0 14px", display: "flex", alignItems: "center", color: COLORS.text, fontFamily: "Inter", fontSize: 16 }}>{mobileChars}<span style={{ opacity: frame % 30 < 15 ? 1 : 0 }}>|</span></div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 6, fontFamily: "Inter" }}>Password</div>
              <div style={{ height: 44, background: "rgba(0,0,0,0.3)", border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "0 14px", display: "flex", alignItems: "center", color: COLORS.text, fontFamily: "Inter", fontSize: 18, letterSpacing: 4 }}>{pwdChars}</div>
            </div>
            <div style={{ height: 48, borderRadius: 10, background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryGlow})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "Space Grotesk", fontWeight: 600, fontSize: 16, boxShadow: `0 8px 24px ${COLORS.primary}50` }}>Sign In →</div>
          </div>
        </div>
        <Cursor from={{ x: 1100, y: 700 }} to={{ x: 960, y: 540 }} startFrame={95} />
      </BrowserFrame>
      <Caption text="Student signs in" sub="Mobile + password, OTP verified" />
    </AbsoluteFill>
  );
};
