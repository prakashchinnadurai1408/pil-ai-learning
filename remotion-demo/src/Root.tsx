import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

// 45 sec at 30fps = 1350 frames
export const RemotionRoot = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={1374}
    fps={30}
    width={1920}
    height={1080}
  />
);
