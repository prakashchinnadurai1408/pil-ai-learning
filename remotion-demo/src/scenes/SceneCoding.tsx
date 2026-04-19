import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { BrowserFrame, Caption } from "../components";
import { COLORS } from "../theme";

const CODE_LINES = [
  { t: "def fibonacci(n):", c: "#C792EA" },
  { t: "    if n <= 1:", c: "#82AAFF" },
  { t: "        return n", c: "#F78C6C" },
  { t: "    return fibonacci(n-1) + fibonacci(n-2)", c: "#82AAFF" },
  { t: "", c: "#fff" },
  { t: "for i in range(10):", c: "#C792EA" },
  { t: "    print(fibonacci(i))", c: "#F78C6C" },
];

export const SceneCoding: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const visibleLines = Math.max(0, Math.floor(interpolate(frame, [10, 80], [0, CODE_LINES.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
  const runFrame = 95;
  const showOutput = frame > runFrame + 15;
  const outputOp = spring({ frame: frame - runFrame - 15, fps, config: { damping: 18 } });
  const btnPress = interpolate(frame, [runFrame, runFrame + 8, runFrame + 16], [1, 0.92, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <BrowserFrame url="aiupskillhub.com/coding/fibonacci">
        <div style={{ height: "100%", display: "flex" }}>
          <div style={{ width: 280, padding: 24, borderRight: `1px solid ${COLORS.border}`, background: "rgba(0,0,0,0.2)" }}>
            <div style={{ padding: "4px 10px", background: `${COLORS.warn}30`, color: COLORS.warn, borderRadius: 6, fontFamily: "Inter", fontSize: 10, fontWeight: 700, display: "inline-block", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>Easy</div>
            <div style={{ fontFamily: "Space Grotesk", fontSize: 20, fontWeight: 700, color: COLORS.text, marginBottom: 12 }}>Fibonacci Series</div>
            <div style={{ fontFamily: "Inter", fontSize: 13, color: COLORS.textDim, lineHeight: 1.6 }}>Write a function that returns the nth Fibonacci number. Then print the first 10.</div>
            <div style={{ marginTop: 20, padding: 12, background: COLORS.card, borderRadius: 8, border: `1px solid ${COLORS.border}` }}>
              <div style={{ fontFamily: "Inter", fontSize: 11, color: COLORS.textDim, marginBottom: 4 }}>Language</div>
              <div style={{ fontFamily: "Inter", fontSize: 14, color: COLORS.text }}>🐍 Python 3</div>
            </div>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, background: "#0d1117", padding: 24, fontFamily: "JetBrains Mono, Menlo, monospace", fontSize: 16, lineHeight: 1.7 }}>
              {CODE_LINES.slice(0, visibleLines).map((line, i) => (
                <div key={i} style={{ display: "flex", color: line.c }}>
                  <span style={{ color: "#3F4756", width: 28, display: "inline-block" }}>{i + 1}</span>
                  <span>{line.t}</span>
                </div>
              ))}
              {visibleLines < CODE_LINES.length && (
                <div style={{ display: "flex", color: "#fff" }}>
                  <span style={{ color: "#3F4756", width: 28 }}>{visibleLines + 1}</span>
                  <span style={{ opacity: frame % 30 < 15 ? 1 : 0 }}>▍</span>
                </div>
              )}
            </div>
            <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: 16, background: "#0a0e15", display: "flex", flexDirection: "column", gap: 10, height: 220 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ padding: "8px 18px", background: COLORS.accent, color: "#000", borderRadius: 8, fontFamily: "Inter", fontWeight: 700, fontSize: 13, transform: `scale(${btnPress})` }}>▶ Run</div>
                <div style={{ fontFamily: "Inter", fontSize: 12, color: COLORS.textDim }}>Output</div>
              </div>
              <div style={{ flex: 1, background: "#000", borderRadius: 8, padding: 14, fontFamily: "JetBrains Mono, monospace", fontSize: 14, color: COLORS.accent, opacity: outputOp }}>
                {showOutput && <pre style={{ margin: 0 }}>{`0\n1\n1\n2\n3\n5\n8\n13\n21\n34\n\n✓ Accepted (12ms)`}</pre>}
              </div>
            </div>
          </div>
        </div>
      </BrowserFrame>
      <Caption text="Code in 40+ languages" sub="In-browser IDE with instant execution" />
    </AbsoluteFill>
  );
};
