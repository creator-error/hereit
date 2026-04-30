"use client";

import { SplatMesh } from "@sparkjsdev/spark";
import * as THREE from "three";

import {
  CAMERA_COLLISION_HEIGHT,
  CAMERA_COLLISION_RADIUS,
} from "@/features/spark-viewer/sceneConstants";
import type { CompassState } from "@/features/spark-viewer/uiTypes";
import type { SceneInitialView, StartingView } from "@/features/spark-viewer/sceneTypes";

export function disposeObject3D(root: THREE.Object3D) {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = mesh.material;
    if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
    else if (material instanceof THREE.Material) material.dispose();
  });
}

export function getWorldBoundingBox(object: SplatMesh) {
  object.updateMatrixWorld(true);
  return object.getBoundingBox().clone().applyMatrix4(object.matrixWorld);
}

export function getObjectWorldBoundingBox(object: THREE.Object3D) {
  object.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(object);
}

export function collectCollisionMeshes(object: THREE.Object3D) {
  const meshes: THREE.Mesh[] = [];
  const debugMaterial = new THREE.MeshBasicMaterial({
    color: "#38bdf8",
    transparent: true,
    opacity: 0.24,
    wireframe: true,
    depthWrite: false,
  });
  object.updateMatrixWorld(true);
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.material = debugMaterial;
    meshes.push(child);
  });
  return meshes;
}

export function collidesWithRoom(
  currentPosition: THREE.Vector3,
  nextPosition: THREE.Vector3,
  collisionMeshes: THREE.Mesh[],
) {
  if (collisionMeshes.length === 0) return false;
  const delta = nextPosition.clone().sub(currentPosition);
  const distance = delta.length();
  if (distance <= 0) return false;
  const direction = delta.divideScalar(distance);
  const side = new THREE.Vector3(-direction.z, 0, direction.x);
  if (side.lengthSq() > 0) side.normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const raycaster = new THREE.Raycaster();
  raycaster.near = 0;
  raycaster.far = distance + CAMERA_COLLISION_RADIUS;
  const origins = [
    currentPosition,
    currentPosition.clone().addScaledVector(side, CAMERA_COLLISION_RADIUS),
    currentPosition.clone().addScaledVector(side, -CAMERA_COLLISION_RADIUS),
    currentPosition.clone().addScaledVector(up, CAMERA_COLLISION_HEIGHT * 0.35),
    currentPosition.clone().addScaledVector(up, -CAMERA_COLLISION_HEIGHT * 0.35),
  ];
  return origins.some((origin) => {
    raycaster.set(origin, direction);
    return raycaster.intersectObjects(collisionMeshes, false).length > 0;
  });
}

export function createPlacementMarker(kind: "audio" | "tag", selected = false) {
  if (kind === "tag") {
    const group = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(selected ? 0.11 : 0.09, 0.018, 16, 32),
      new THREE.MeshBasicMaterial({
        color: selected ? "#f8e39a" : "#d4af37",
        transparent: true,
        opacity: 0.98,
      }),
    );
    ring.rotation.x = Math.PI / 2;
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(selected ? 0.038 : 0.03, 16, 12),
      new THREE.MeshBasicMaterial({
        color: selected ? "#fff8db" : "#f4d574",
        transparent: true,
        opacity: 0.95,
      }),
    );
    group.add(ring);
    group.add(core);
    group.name = "tag-marker";
    return group;
  }

  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(selected ? 0.12 : 0.08, 16, 12),
    new THREE.MeshBasicMaterial({
      color: selected ? "#fb7185" : kind === "audio" ? "#38bdf8" : "#facc15",
      transparent: true,
      opacity: selected ? 0.95 : 0.82,
    }),
  );
  marker.name = `${kind}-marker`;
  return marker;
}

export function renderTopDownMapFromCollisionMeshes(
  meshes: THREE.Mesh[],
  bounds: THREE.Box3,
  size = 256,
) {
  if (typeof document === "undefined" || meshes.length === 0) {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  context.clearRect(0, 0, size, size);
  context.fillStyle = "#08111e";
  context.fillRect(0, 0, size, size);

  const padding = 12;
  const spanX = Math.max(bounds.max.x - bounds.min.x, 0.001);
  const spanZ = Math.max(bounds.max.z - bounds.min.z, 0.001);
  const scale = Math.min((size - padding * 2) / spanX, (size - padding * 2) / spanZ);
  const offsetX = (size - spanX * scale) * 0.5;
  const offsetY = (size - spanZ * scale) * 0.5;

  const project = (x: number, z: number) => ({
    x: offsetX + (x - bounds.min.x) * scale,
    y: size - (offsetY + (z - bounds.min.z) * scale),
  });

  context.strokeStyle = "rgba(125, 211, 252, 0.55)";
  context.fillStyle = "rgba(56, 189, 248, 0.18)";
  context.lineWidth = 0.8;

  const triangleA = new THREE.Vector3();
  const triangleB = new THREE.Vector3();
  const triangleC = new THREE.Vector3();

  for (const mesh of meshes) {
    const geometry = mesh.geometry;
    const positionAttribute = geometry.getAttribute("position");
    if (!positionAttribute) {
      continue;
    }

    const indexAttribute = geometry.getIndex();
    const readVertex = (vertexIndex: number, target: THREE.Vector3) => {
      target.fromBufferAttribute(positionAttribute, vertexIndex).applyMatrix4(mesh.matrixWorld);
    };

    const triangleCount = indexAttribute
      ? Math.floor(indexAttribute.count / 3)
      : Math.floor(positionAttribute.count / 3);

    for (let triangleIndex = 0; triangleIndex < triangleCount; triangleIndex += 1) {
      const aIndex = indexAttribute ? indexAttribute.getX(triangleIndex * 3) : triangleIndex * 3;
      const bIndex = indexAttribute ? indexAttribute.getX(triangleIndex * 3 + 1) : triangleIndex * 3 + 1;
      const cIndex = indexAttribute ? indexAttribute.getX(triangleIndex * 3 + 2) : triangleIndex * 3 + 2;

      readVertex(aIndex, triangleA);
      readVertex(bIndex, triangleB);
      readVertex(cIndex, triangleC);

      const a = project(triangleA.x, triangleA.z);
      const b = project(triangleB.x, triangleB.z);
      const c = project(triangleC.x, triangleC.z);

      context.beginPath();
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
      context.lineTo(c.x, c.y);
      context.closePath();
      context.fill();
      context.stroke();
    }
  }

  return canvas.toDataURL("image/png");
}

export function alignCameraHeightToCollisionBounds(
  camera: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  bounds: THREE.Box3,
) {
  const size = bounds.getSize(new THREE.Vector3());
  const floorY = bounds.min.y;
  const ceilingY = bounds.max.y;
  const desiredEyeHeight = THREE.MathUtils.clamp(size.y * 0.1, 1.1, 1.75);
  const desiredY = THREE.MathUtils.clamp(
    floorY + desiredEyeHeight,
    floorY + 0.95,
    ceilingY - 0.2,
  );
  const deltaY = desiredY - camera.position.y;
  camera.position.y = desiredY;
  target.y += deltaY;

  const horizontalDirection = target.clone().sub(camera.position);
  horizontalDirection.y = 0;
  if (horizontalDirection.lengthSq() > 0) {
    horizontalDirection.normalize();
    const forwardNudge = THREE.MathUtils.clamp(Math.min(size.x, size.z) * 0.1, 0.24, 0.8);
    camera.position.addScaledVector(horizontalDirection, forwardNudge);
    target.addScaledVector(horizontalDirection, forwardNudge);
  }

  const insetX = THREE.MathUtils.clamp(size.x * 0.08, 0.2, 0.8);
  const insetZ = THREE.MathUtils.clamp(size.z * 0.08, 0.2, 0.8);
  camera.position.x = THREE.MathUtils.clamp(camera.position.x, bounds.min.x + insetX, bounds.max.x - insetX);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, bounds.min.z + insetZ, bounds.max.z - insetZ);

  camera.lookAt(target);
  return {
    ceilingY,
    desiredY,
    floorY,
  };
}

export function toCompassState(direction: THREE.Vector3): CompassState {
  const normalizedHeading = THREE.MathUtils.euclideanModulo(
    THREE.MathUtils.radToDeg(Math.atan2(direction.x, -direction.z)),
    360,
  );
  const headings = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(normalizedHeading / 45) % headings.length;
  return {
    heading: headings[index],
    pitchDeg: THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(direction.y, -1, 1))),
    rotationDeg: normalizedHeading,
  };
}

export function prepareStartingView(
  camera: THREE.PerspectiveCamera,
  object: SplatMesh,
): StartingView {
  const box = getWorldBoundingBox(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z, 0);
  const orientation = new THREE.Euler(0, 0, 0, "YXZ");
  if (!Number.isFinite(maxSize) || maxSize <= 0) {
    camera.near = 0.01;
    camera.far = Math.max(size.length() * 3, 50);
    camera.position.copy(center);
    camera.up.set(0, 1, 0);
    const target = center.clone().add(new THREE.Vector3(0, 0, -1));
    camera.lookAt(target);
    orientation.setFromQuaternion(camera.quaternion, "YXZ");
    camera.updateProjectionMatrix();
    return {
      moveSpeed: 1,
      pitch: orientation.x,
      position: camera.position.clone(),
      radius: 1,
      target,
      yaw: orientation.y,
    };
  }
  const start = center.clone();
  const target = center.clone();
  const horizontalSpan = Math.max(size.x, size.z);
  const horizontalDepth = Math.min(size.x, size.z);
  const isInteriorLike =
    size.y >= 1.6 && horizontalDepth >= 1.6 && horizontalSpan / Math.max(size.y, 0.01) >= 1.15;
  const farPlane = Math.max(maxSize * 20, 100);
  camera.near = 0.01;
  camera.far = farPlane;
  camera.up.set(0, 1, 0);

  if (isInteriorLike) {
    const dominantHorizontalAxis = size.x >= size.z ? "x" : "z";
    const horizontalInsetX = Math.max(size.x * 0.18, 0.4);
    const horizontalInsetZ = Math.max(size.z * 0.18, 0.4);
    const eyeHeight = THREE.MathUtils.clamp(size.y * 0.12, 0.6, 1.4);
    const headroom = Math.max(size.y * 0.02, 0);
    const minimumInteriorY = box.min.y + Math.max(size.y * 0.04, 0.16);
    const lookDownOffset = Math.max(size.y * 0.03, 0.05);
    const initialRaise = THREE.MathUtils.clamp(Math.max(maxSize * 0.025, 0.14), 0.14, 0.32);
    const startOffset =
      dominantHorizontalAxis === "x" ? Math.max(size.x * 0.1, 0.45) : Math.max(size.z * 0.1, 0.45);
    const northLookOffset = Math.max(size.z * 0.08, 0.45);
    const extraLift = THREE.MathUtils.clamp(size.y * 0.72, 2.2, 4.8);
    const forwardNudge =
      dominantHorizontalAxis === "x"
        ? THREE.MathUtils.clamp(size.z * 0.08, 0.22, 0.7)
        : THREE.MathUtils.clamp(size.z * 0.1, 0.28, 0.95);

    start.y = THREE.MathUtils.clamp(
      Math.max(box.min.y + eyeHeight + initialRaise + extraLift, minimumInteriorY),
      box.min.y + 1.2,
      box.max.y - headroom,
    );
    target.y = start.y - lookDownOffset;

    if (dominantHorizontalAxis === "x") {
      start.x = THREE.MathUtils.clamp(
        center.x - startOffset,
        box.min.x + horizontalInsetX,
        box.max.x - horizontalInsetX,
      );
      target.x = start.x;
      start.z = THREE.MathUtils.clamp(
        start.z,
        box.min.z + horizontalInsetZ,
        box.max.z - horizontalInsetZ,
      );
    } else {
      start.z = THREE.MathUtils.clamp(
        center.z - startOffset,
        box.min.z + horizontalInsetZ,
        box.max.z - horizontalInsetZ,
      );
      start.x = THREE.MathUtils.clamp(
        start.x,
        box.min.x + horizontalInsetX,
        box.max.x - horizontalInsetX,
      );
    }

    target.z = THREE.MathUtils.clamp(
      start.z - northLookOffset,
      box.min.z + horizontalInsetZ,
      box.max.z - horizontalInsetZ,
    );
    start.z = THREE.MathUtils.clamp(
      start.z - forwardNudge,
      box.min.z + horizontalInsetZ,
      box.max.z - horizontalInsetZ,
    );
    target.z = THREE.MathUtils.clamp(
      target.z - forwardNudge,
      box.min.z + horizontalInsetZ,
      box.max.z - horizontalInsetZ,
    );
  } else {
    const radius = Math.max(size.length() * 0.5, maxSize * 0.5, 0.5);
    const fitOffset = radius / Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
    const startDirection = new THREE.Vector3(-0.85, 0.35, 1).normalize();
    const framingDistance = Math.max(fitOffset * 1.15, radius * 1.8, 1.25);
    const verticalBias = THREE.MathUtils.clamp(size.y * 0.12, 0.1, radius * 0.45);

    target.copy(center);
    target.y = center.y + verticalBias;
    start.copy(center).addScaledVector(startDirection, framingDistance);
    start.y = center.y + verticalBias + framingDistance * 0.12;
    if (start.y < box.min.y + 0.2) {
      start.y = box.min.y + 0.2;
    }
    if (target.y > box.max.y) {
      target.y = box.max.y;
    }
  }

  camera.position.copy(start);
  camera.lookAt(target);
  orientation.setFromQuaternion(camera.quaternion, "YXZ");
  camera.updateProjectionMatrix();
  return {
    moveSpeed: Math.max(maxSize * 0.2, isInteriorLike ? 0.35 : 0.2),
    pitch: orientation.x,
    position: start.clone(),
    radius: Math.max(camera.position.distanceTo(target), 0.1),
    target,
    yaw: orientation.y,
  };
}

export function applyInitialViewToCamera(
  camera: THREE.PerspectiveCamera,
  initialView: SceneInitialView,
): StartingView {
  const position = new THREE.Vector3(
    initialView.position.x,
    initialView.position.y,
    initialView.position.z,
  );
  const target = new THREE.Vector3(
    initialView.target.x,
    initialView.target.y,
    initialView.target.z,
  );
  const direction = target.clone().sub(position).normalize();
  const yaw = THREE.MathUtils.euclideanModulo(
    Math.atan2(direction.x, -direction.z) + Math.PI,
    Math.PI * 2,
  ) - Math.PI;
  const pitch = Math.asin(THREE.MathUtils.clamp(direction.y, -1, 1));
  camera.position.copy(position);
  camera.lookAt(target);
  camera.updateProjectionMatrix();

  return {
    moveSpeed: 0.5,
    pitch,
    position: position.clone(),
    radius: Math.max(position.distanceTo(target), 0.1),
    target,
    yaw,
  };
}

export function prepareCenteredViewFromBounds(
  camera: THREE.PerspectiveCamera,
  bounds: THREE.Box3,
): StartingView {
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const eyeHeight = THREE.MathUtils.clamp(size.y * 0.1, 1.1, 1.75);
  const insetY = THREE.MathUtils.clamp(center.y, bounds.min.y + 0.95, bounds.max.y - 0.2);
  const position = new THREE.Vector3(center.x, Math.max(insetY, bounds.min.y + eyeHeight), center.z);
  const forwardOffset = THREE.MathUtils.clamp(Math.max(size.z * 0.18, 0.9), 0.9, 3.2);
  const target = new THREE.Vector3(center.x, position.y - 0.05, center.z - forwardOffset);
  const orientation = new THREE.Euler(0, 0, 0, "YXZ");
  camera.position.copy(position);
  camera.lookAt(target);
  orientation.setFromQuaternion(camera.quaternion, "YXZ");
  camera.updateProjectionMatrix();

  return {
    moveSpeed: Math.max(Math.max(size.x, size.z) * 0.2, 0.35),
    pitch: orientation.x,
    position: position.clone(),
    radius: Math.max(position.distanceTo(target), 0.1),
    target,
    yaw: orientation.y,
  };
}
