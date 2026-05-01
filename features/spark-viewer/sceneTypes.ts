"use client";

import type * as THREE from "three";

import type { JoystickVector } from "@/features/spark-viewer/uiTypes";

export type InputState = {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  faster: boolean;
};

export type OrientationState = {
  yaw: number;
  pitch: number;
};

export type StartingView = {
  moveSpeed: number;
  pitch: number;
  position: THREE.Vector3;
  radius: number;
  target: THREE.Vector3;
  yaw: number;
};

export type ViewerLoadingState = {
  active: boolean;
  mode: "busy" | "progress";
  progress: number;
  stage: string;
  detail: string;
};

export type SceneInitialView = {
  position: {
    x: number;
    y: number;
    z: number;
  };
  target: {
    x: number;
    y: number;
    z: number;
  };
};

export type SparkScenePlacement =
  | {
      gain: number;
      id?: string;
      kind: "audio";
      label: string;
      loop: boolean;
      position: {
        x: number;
        y: number;
        z: number;
      };
      refDistance?: number;
      maxDistance?: number;
      rolloffFactor?: number;
      selected?: boolean;
      url: string;
    }
  | {
      id?: string;
      kind: "tag";
      label: string;
      linkUrl?: string | null;
      title: string;
      position: {
        x: number;
        y: number;
        z: number;
      };
      selected?: boolean;
    };

export type SparkSceneCreatePoint = {
  x: number;
  y: number;
  z: number;
};

export type SparkSceneTagSelection = Extract<SparkScenePlacement, { kind: "tag" }>;

export type SparkAudioSource = {
  gain: number;
  id?: string;
  loop: boolean;
  name: string;
  position: {
    x: number;
    y: number;
    z: number;
  };
  refDistance?: number;
  maxDistance?: number;
  rolloffFactor?: number;
  selected?: boolean;
  url: string;
};

export type MovementControlKey = keyof Pick<
  InputState,
  "forward" | "back" | "left" | "right" | "up" | "down"
>;

export type SparkSceneProps = {
  isSharedView?: boolean;
  collisionAssetUrl?: string | null;
  initialView?: SceneInitialView | null;
  placements?: SparkScenePlacement[];
  onCreatePlacementAtPoint?: (position: SparkSceneCreatePoint) => void;
  onLoadingStateChange?: (state: ViewerLoadingState) => void;
  onSelectTag?: (tag: SparkSceneTagSelection | null) => void;
  onViewStateChange?: (view: SceneInitialView) => void;
  reducedControls?: boolean;
  soundEnabled?: boolean;
  onSoundEnabledChange?: (enabled: boolean) => void;
  splatAssetUrl?: string | null;
  showCollisionMesh?: boolean;
};

export type { JoystickVector };
