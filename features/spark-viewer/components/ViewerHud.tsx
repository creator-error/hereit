"use client";

import { SceneMiniMap } from "@/features/spark-viewer/components/SceneMiniMap";
import type { SparkScenePlacement } from "@/features/spark-viewer/sceneTypes";
import { useViewerUiStore } from "@/features/spark-viewer/stores/viewerUiStore";
import { SceneTools } from "./SceneTools";

type MovementControlKey = "forward" | "back" | "left" | "right" | "up" | "down";

type ViewerHudProps = {
  placements: SparkScenePlacement[];
  setMovementControl: (key: MovementControlKey, active: boolean) => void;
  endMovementControl: (key: MovementControlKey) => void;
  setSoundEnabled: (enabled: boolean) => void | null;
};

export function ViewerHud({
  placements,
  setMovementControl,
  endMovementControl,
  setSoundEnabled,
}: ViewerHudProps) {
  const { mapBounds, mapCameraPosition, mapImageDataUrl } = useViewerUiStore();

  return (
    <div className="contents">
      <SceneMiniMap
        cameraPosition={mapCameraPosition}
        mapImageDataUrl={mapImageDataUrl}
        mapBounds={mapBounds}
        placements={placements}
      />
      <SceneTools
        className="absolute right-[max(20px,env(safe-area-inset-right))] bottom-[max(32px,calc(env(safe-area-inset-bottom)+24px))] "
        setMovementControl={setMovementControl}
        endMovementControl={endMovementControl}
        setSoundEnabled={setSoundEnabled}
      />
    </div>
  );
}
