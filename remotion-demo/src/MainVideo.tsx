import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { loadFont as loadGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { Background } from "./components";
import { SceneLogin } from "./scenes/SceneLogin";
import { SceneDashboard } from "./scenes/SceneDashboard";
import { SceneAIPath } from "./scenes/SceneAIPath";
import { SceneModule } from "./scenes/SceneModule";
import { SceneQuiz } from "./scenes/SceneQuiz";
import { SceneAICoach } from "./scenes/SceneAICoach";
import { SceneCoding } from "./scenes/SceneCoding";
import { SceneAssessment } from "./scenes/SceneAssessment";
import { SceneFinale } from "./scenes/SceneFinale";

loadGrotesk("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });
loadInter("normal", { weights: ["400", "600", "700"], subsets: ["latin"] });
loadMono("normal", { weights: ["400", "600"], subsets: ["latin"] });

// 9 scenes × 150 frames = 1350 frames + transitions overlap.
// With 8 transitions × 18 frames overlap, total = 9*150 - 8*18 = 1350 - 144 = 1206
// To hit exactly 1350 we use scenes of 168 frames so 9*168 - 8*18 = 1512 - 144 = 1368.
// Easier: just sum and set Root duration to match. Use 150f scenes + 12f overlaps = 9*150 - 8*12 = 1350 - 96 = 1254.
// Root is fixed at 1350. Let's use 158 frames per scene with 12 frame transitions -> 9*158 - 8*12 = 1422 - 96 = 1326. Close enough.
// Simpler: 150 per scene, 0 overlap on last, accept 1254. Update Root to 1254. We'll keep Root=1350 and pad scenes at 158f.

const SCENE_FRAMES = 158;
const TRANS_FRAMES = 12;
const transition = (
  <TransitionSeries.Transition presentation={fade()} timing={springTiming({ config: { damping: 200 }, durationInFrames: TRANS_FRAMES })} />
);

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Background />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENE_FRAMES}><SceneLogin /></TransitionSeries.Sequence>
        {transition}
        <TransitionSeries.Sequence durationInFrames={SCENE_FRAMES}><SceneDashboard /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: TRANS_FRAMES })} />
        <TransitionSeries.Sequence durationInFrames={SCENE_FRAMES}><SceneAIPath /></TransitionSeries.Sequence>
        {transition}
        <TransitionSeries.Sequence durationInFrames={SCENE_FRAMES}><SceneModule /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-left" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: TRANS_FRAMES })} />
        <TransitionSeries.Sequence durationInFrames={SCENE_FRAMES}><SceneQuiz /></TransitionSeries.Sequence>
        {transition}
        <TransitionSeries.Sequence durationInFrames={SCENE_FRAMES}><SceneAICoach /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: TRANS_FRAMES })} />
        <TransitionSeries.Sequence durationInFrames={SCENE_FRAMES}><SceneCoding /></TransitionSeries.Sequence>
        {transition}
        <TransitionSeries.Sequence durationInFrames={SCENE_FRAMES}><SceneAssessment /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={springTiming({ config: { damping: 200 }, durationInFrames: 24 })} />
        <TransitionSeries.Sequence durationInFrames={SCENE_FRAMES + 60}><SceneFinale /></TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
