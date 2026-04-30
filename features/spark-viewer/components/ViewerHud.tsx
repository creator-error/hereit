"use client";

import { CompassHud } from "@/features/spark-viewer/components/CompassHud";
import { MovementControlsHud } from "@/features/spark-viewer/components/MovementControlsHud";
import { SceneMiniMap } from "@/features/spark-viewer/components/SceneMiniMap";
import type { SparkScenePlacement } from "@/features/spark-viewer/sceneTypes";
import { useViewerUiStore } from "@/features/spark-viewer/stores/viewerUiStore";

type MovementControlKey = "forward" | "back" | "left" | "right" | "up" | "down";

type ViewerHudProps = {
  endMovementControl: (key: MovementControlKey) => void;
  onJoystickPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onJoystickPointerLeave: (event: React.PointerEvent<HTMLDivElement>) => void;
  onJoystickPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onJoystickPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
  placements: SparkScenePlacement[];
  reducedControls?: boolean;
  setMovementControl: (key: MovementControlKey, active: boolean) => void;
};

export function ViewerHud({
  endMovementControl,
  onJoystickPointerDown,
  onJoystickPointerLeave,
  onJoystickPointerMove,
  onJoystickPointerUp,
  placements,
  reducedControls = false,
  setMovementControl,
}: ViewerHudProps) {
  const { compass, joystickOffset, mapBounds, mapCameraPosition, mapImageDataUrl, status } =
    useViewerUiStore();

  return (
    <div className="contents">
      <SceneMiniMap
        cameraPosition={mapCameraPosition}
        mapImageDataUrl={mapImageDataUrl}
        mapBounds={mapBounds}
        placements={placements}
      />
      {/* <div className="pointer-events-none absolute top-4 right-4 z-[1] max-w-[min(360px,calc(100vw-32px))] rounded-[16px] bg-[rgba(8,17,30,0.7)] px-3 py-2 text-[12px] leading-5 text-[rgba(255,255,255,0.92)] backdrop-blur-[10px]">
        {status}
      </div> */}
      {/* <CompassHud compass={compass} /> */}
      <MovementControlsHud
        joystickOffset={joystickOffset}
        onJoystickPointerDown={onJoystickPointerDown}
        onJoystickPointerMove={onJoystickPointerMove}
        onJoystickPointerUp={onJoystickPointerUp}
        onJoystickPointerLeave={onJoystickPointerLeave}
        reduced={reducedControls}
        setMovementControl={setMovementControl}
        endMovementControl={endMovementControl}
      />
    </div>
  );
}
