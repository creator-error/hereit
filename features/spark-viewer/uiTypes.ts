"use client";

export type CompassState = {
  heading: string;
  pitchDeg: number;
  rotationDeg: number;
};

export type JoystickVector = {
  x: number;
  y: number;
};

export type ViewerUiState = {
  compass: CompassState;
  joystickOffset: JoystickVector;
  mapBounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  } | null;
  mapCameraPosition: {
    x: number;
    z: number;
  } | null;
  mapImageDataUrl: string | null;
  status: string;
};
