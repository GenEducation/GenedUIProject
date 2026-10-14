import type { ComponentType } from "react";
import type { SceneId } from "../filmScript";
import type { Progress } from "../primitives";
import { SceneOpen } from "./SceneOpen";
import { SceneAsk } from "./SceneAsk";
import { SceneSpeak } from "./SceneSpeak";
import { SceneCardKnow, SceneCardSee } from "./SceneCard";
import { SceneParentHome } from "./SceneParentHome";
import { SceneReport } from "./SceneReport";
import { SceneClose } from "./SceneClose";

export const SCENE_COMPONENTS: Record<SceneId, ComponentType<{ p: Progress }>> = {
  open: SceneOpen,
  ask: SceneAsk,
  speak: SceneSpeak,
  cardSee: SceneCardSee,
  parentHome: SceneParentHome,
  cardKnow: SceneCardKnow,
  report: SceneReport,
  close: SceneClose,
};
