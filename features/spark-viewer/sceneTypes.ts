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

export type SparkAudioSource = {
  gain: number;
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
  url: string;
};

export type MovementControlKey = keyof Pick<
  InputState,
  "forward" | "back" | "left" | "right" | "up" | "down"
>;

export type SparkSceneProps = {
  audioSources?: SparkAudioSource[];
  collisionAssetUrl?: string | null;
  onLoadingStateChange?: (state: ViewerLoadingState) => void;
  soundEnabled?: boolean;
  splatAssetUrl?: string | null;
  showCollisionMesh?: boolean;
};

export type { JoystickVector };
