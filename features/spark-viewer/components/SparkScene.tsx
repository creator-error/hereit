"use client";

import { useEffect, useRef } from "react";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ViewerHud } from "@/features/spark-viewer/components/ViewerHud";
import {
  COLLISION_ASSET_URL,
  COLLISION_MESH_ROTATION,
  INITIAL_RENDER_WARMUP_DELAY_MS,
  INITIAL_RENDER_WARMUP_PASSES,
  POSITIONAL_AUDIO_SOURCES,
  SPLAT_MESH_ROTATION,
  SPARK_ASSET_URL,
} from "@/features/spark-viewer/sceneConstants";
import {
  applyInitialViewToCamera,
  alignCameraHeightToCollisionBounds,
  collectCollisionMeshes,
  collidesWithRoom,
  createPlacementMarker,
  disposeObject3D,
  getObjectWorldBoundingBox,
  getWorldBoundingBox,
  prepareCenteredViewFromBounds,
  prepareStartingView,
  renderTopDownMapFromCollisionMeshes,
  toCompassState,
} from "@/features/spark-viewer/sceneHelpers";
import type {
  InputState,
  JoystickVector,
  MovementControlKey,
  OrientationState,
  SparkSceneProps,
  SparkScenePlacement,
  ViewerLoadingState,
} from "@/features/spark-viewer/sceneTypes";
import { useViewerUiStore } from "@/features/spark-viewer/stores/viewerUiStore";

export type { ViewerLoadingState } from "@/features/spark-viewer/sceneTypes";

export function SparkScene({
  collisionAssetUrl = COLLISION_ASSET_URL,
  initialView = null,
  placements,
  onCreatePlacementAtPoint,
  onLoadingStateChange,
  onSelectTag,
  onViewStateChange,
  soundEnabled = false,
  onSoundEnabledChange,
  splatAssetUrl = SPARK_ASSET_URL,
  showCollisionMesh = false,
}: SparkSceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const audioListenerRef = useRef<THREE.AudioListener | null>(null);
  const collisionRoomRef = useRef<THREE.Object3D | null>(null);
  const placementGroupRef = useRef<THREE.Group | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const initialViewRef = useRef<SparkSceneProps["initialView"]>(initialView);
  const onCreatePlacementAtPointRef =
    useRef<SparkSceneProps["onCreatePlacementAtPoint"]>(onCreatePlacementAtPoint);
  const onLoadingStateChangeRef =
    useRef<SparkSceneProps["onLoadingStateChange"]>(onLoadingStateChange);
  const onSelectTagRef = useRef<SparkSceneProps["onSelectTag"]>(onSelectTag);
  const onViewStateChangeRef = useRef<SparkSceneProps["onViewStateChange"]>(onViewStateChange);
  const placementsRef = useRef<SparkScenePlacement[] | undefined>(placements);
  const positionalAudioRef = useRef<THREE.PositionalAudio[]>([]);
  const worldBoundsRef = useRef<THREE.Box3 | null>(null);
  const requestRenderRef = useRef<() => void>(() => {});
  const inputStateRef = useRef<InputState>({
    forward: false,
    back: false,
    left: false,
    right: false,
    up: false,
    down: false,
    faster: false,
  });
  const movementJoystickRef = useRef<JoystickVector>({ x: 0, y: 0 });
  const showCollisionMeshRef = useRef(false);
  const loadingPhaseRankRef = useRef(0);
  const setCompass = useViewerUiStore((state) => state.setCompass);
  const setJoystickOffset = useViewerUiStore((state) => state.setJoystickOffset);
  const setMapBounds = useViewerUiStore((state) => state.setMapBounds);
  const setMapCameraPosition = useViewerUiStore((state) => state.setMapCameraPosition);
  const setMapImageDataUrl = useViewerUiStore((state) => state.setMapImageDataUrl);
  const setStatus = useViewerUiStore((state) => state.setStatus);
  const resetViewerUi = useViewerUiStore((state) => state.reset);

  useEffect(() => {
    initialViewRef.current = initialView;
  }, [initialView]);

  useEffect(() => {
    onLoadingStateChangeRef.current = onLoadingStateChange;
  }, [onLoadingStateChange]);

  useEffect(() => {
    onCreatePlacementAtPointRef.current = onCreatePlacementAtPoint;
  }, [onCreatePlacementAtPoint]);

  useEffect(() => {
    onSelectTagRef.current = onSelectTag;
  }, [onSelectTag]);

  useEffect(() => {
    onViewStateChangeRef.current = onViewStateChange;
  }, [onViewStateChange]);

  useEffect(() => {
    placementsRef.current = placements;
  }, [placements]);

  useEffect(() => {
    showCollisionMeshRef.current = showCollisionMesh;
    const collisionRoom = collisionRoomRef.current;
    if (!collisionRoom) {
      return;
    }

    collisionRoom.visible = showCollisionMesh;
    requestRenderRef.current();
  }, [showCollisionMesh]);

  useEffect(() => {
    void (async () => {
      const context = audioListenerRef.current?.context;

      if (soundEnabled && context?.state === "suspended") {
        await context.resume();
      }

      for (const audio of positionalAudioRef.current) {
        if (soundEnabled) {
          if (!audio.isPlaying && audio.buffer) {
            audio.play();
          }
        } else if (audio.isPlaying) {
          audio.pause();
        }
      }
    })();
  }, [soundEnabled]);

  const reportLoadingState = (state: ViewerLoadingState) => {
    const nextRank = state.active ? (state.mode === "progress" ? 1 : 2) : 3;
    const currentRank = loadingPhaseRankRef.current;

    if (nextRank < currentRank) {
      return;
    }

    loadingPhaseRankRef.current = nextRank;
    onLoadingStateChangeRef.current?.({
      ...state,
      progress: THREE.MathUtils.clamp(Math.round(state.progress), 0, 100),
    });
  };

  const setMovementControl = (key: MovementControlKey, active: boolean) => {
    inputStateRef.current[key] = active;
    requestRenderRef.current();
  };

  const endMovementControl = (key: MovementControlKey) => {
    setMovementControl(key, false);
  };

  const isTypingTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    const tagName = target.tagName.toLowerCase();

    return (
      tagName === "input" ||
      tagName === "textarea" ||
      tagName === "select" ||
      target.isContentEditable
    );
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color("#08111e");

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
    cameraRef.current = camera;
    const audioListener = new THREE.AudioListener();
    audioListenerRef.current = audioListener;
    camera.add(audioListener);

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });

    renderer.setPixelRatio(1);
    renderer.setSize(width, height);
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.style.cursor = "grab";
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight("#ffffff", 0.9));
    const keyLight = new THREE.DirectionalLight("#ffffff", 0.8);
    keyLight.position.set(5, 9, 3);
    scene.add(keyLight);

    const input = inputStateRef.current;
    input.forward = false;
    input.back = false;
    input.left = false;
    input.right = false;
    input.up = false;
    input.down = false;
    input.faster = false;

    const orientation: OrientationState = {
      yaw: 0,
      pitch: 0,
    };

    const euler = new THREE.Euler(0, 0, 0, "YXZ");
    const forwardVector = new THREE.Vector3();
    const rightVector = new THREE.Vector3();
    const movement = new THREE.Vector3();
    const moveTarget = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const lookTarget = new THREE.Vector3();
    const clock = new THREE.Clock();
    const lookSensitivity = 0.0032;
    const formatNumber = (value: number) => value.toFixed(2);
    const formatVector = (vector: THREE.Vector3) =>
      `${formatNumber(vector.x)}, ${formatNumber(vector.y)}, ${formatNumber(vector.z)}`;

    let moveSpeed = 0.05;
    let lookRadius = 1;
    let dragging = false;
    let dragMoved = false;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let renderRequested = true;
    let disposed = false;
    let tapMoveTarget: THREE.Vector3 | null = null;
    let splatMesh: SplatMesh | null = null;
    let collisionRoom: THREE.Object3D | null = null;
    let collisionMeshes: THREE.Mesh[] = [];
    const audioObjects: THREE.Object3D[] = [];
    const dragThresholdPx = 6;
    const onPointerLeave = () => {
      if (dragging) {
        renderer.domElement.style.cursor = "grab";
      }
    };

    const requestRender = () => {
      renderRequested = true;
    };
    requestRenderRef.current = requestRender;

    const sparkRenderer = new SparkRenderer({
      renderer,
      onDirty: requestRender,
    });
    scene.add(sparkRenderer);

    const updateCameraMapPosition = () => {
      setMapCameraPosition({
        x: camera.position.x,
        z: camera.position.z,
      });
    };

    const applyOrientation = () => {
      orientation.pitch = THREE.MathUtils.clamp(
        orientation.pitch,
        -Math.PI / 2 + 0.01,
        Math.PI / 2 - 0.01,
      );
      direction
        .set(
          Math.sin(orientation.yaw) * Math.cos(orientation.pitch),
          Math.sin(orientation.pitch),
          -Math.cos(orientation.yaw) * Math.cos(orientation.pitch),
        )
        .normalize();
      lookTarget.copy(camera.position).addScaledVector(direction, lookRadius);
      euler.set(orientation.pitch, orientation.yaw, 0);
      camera.quaternion.setFromEuler(euler);
      camera.lookAt(lookTarget);
      const nextCompass = toCompassState(direction);
      setCompass((current) => {
        if (
          current.heading === nextCompass.heading &&
          Math.abs(current.pitchDeg - nextCompass.pitchDeg) < 0.5 &&
          Math.abs(current.rotationDeg - nextCompass.rotationDeg) < 0.5
        ) {
          return current;
        }

        return nextCompass;
      });
      onViewStateChangeRef.current?.({
        position: {
          x: camera.position.x,
          y: camera.position.y,
          z: camera.position.z,
        },
        target: {
          x: lookTarget.x,
          y: lookTarget.y,
          z: lookTarget.z,
        },
      });
      updateCameraMapPosition();
    };

    const renderFrame = () => {
      renderer.render(scene, camera);
    };

    const onResize = () => {
      const nextWidth = container.clientWidth;
      const nextHeight = container.clientHeight;

      if (nextWidth <= 0 || nextHeight <= 0) {
        return;
      }

      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(nextWidth, nextHeight);
      requestRender();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) {
        return;
      }

      dragging = true;
      dragMoved = false;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      renderer.domElement.style.cursor = "grabbing";
      renderer.domElement.setPointerCapture(event.pointerId);
      requestRender();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) {
        return;
      }

      const deltaX = event.clientX - lastPointerX;
      const deltaY = event.clientY - lastPointerY;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      if (Math.abs(deltaX) > dragThresholdPx || Math.abs(deltaY) > dragThresholdPx) {
        dragMoved = true;
      }

      orientation.yaw -= deltaX * lookSensitivity;
      orientation.pitch += deltaY * lookSensitivity;
      applyOrientation();
      requestRender();
    };

    const endDrag = (event: PointerEvent) => {
      dragging = false;
      renderer.domElement.style.cursor = "grab";
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
      if (dragMoved) {
        return;
      }

      if (onCreatePlacementAtPointRef.current || collisionMeshes.length === 0) {
        return;
      }

      const rect = renderer.domElement.getBoundingClientRect();
      const pointer = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(pointer, camera);

      const placementGroup = placementGroupRef.current;
      const placementHits = placementGroup
        ? raycaster.intersectObjects(placementGroup.children, true)
        : [];
      const tagSelection = placementHits
        .map((hit) => {
          let current: THREE.Object3D | null = hit.object;
          while (current) {
            if (current.userData?.kind === "tag") {
              return current.userData.tag as SparkScenePlacement;
            }
            current = current.parent;
          }
          return null;
        })
        .find(Boolean);

      if (tagSelection && tagSelection.kind === "tag") {
        onSelectTagRef.current?.(tagSelection);
        tapMoveTarget = null;
        return;
      }

      onSelectTagRef.current?.(null);

      const intersections = raycaster.intersectObjects(collisionMeshes, false);
      const point = intersections[0]?.point;

      if (!point) {
        return;
      }

      tapMoveTarget = point.clone();
      requestRender();
    };

    const placeFromEvent = (event: MouseEvent) => {
      if (!onCreatePlacementAtPointRef.current || collisionMeshes.length === 0) {
        return;
      }

      const rect = renderer.domElement.getBoundingClientRect();
      const pointer = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(pointer, camera);
      const intersections = raycaster.intersectObjects(collisionMeshes, false);
      const point = intersections[0]?.point;

      if (!point) {
        return;
      }

      onCreatePlacementAtPointRef.current({
        x: point.x,
        y: point.y,
        z: point.z,
      });
    };

    const onDoubleClick = (event: MouseEvent) => {
      event.preventDefault();
      placeFromEvent(event);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) {
        return;
      }

      switch (event.code) {
        case "KeyW":
        case "ArrowUp":
          input.forward = true;
          break;
        case "KeyS":
        case "ArrowDown":
          input.back = true;
          break;
        case "KeyA":
        case "ArrowLeft":
          input.left = true;
          break;
        case "KeyD":
        case "ArrowRight":
          input.right = true;
          break;
        case "KeyQ":
          input.down = true;
          break;
        case "KeyE":
        case "Space":
          input.up = true;
          break;
        default:
          return;
      }

      event.preventDefault();
      requestRender();
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) {
        return;
      }

      switch (event.code) {
        case "KeyW":
        case "ArrowUp":
          input.forward = false;
          break;
        case "KeyS":
        case "ArrowDown":
          input.back = false;
          break;
        case "KeyA":
        case "ArrowLeft":
          input.left = false;
          break;
        case "KeyD":
        case "ArrowRight":
          input.right = false;
          break;
        case "KeyQ":
          input.down = false;
          break;
        case "KeyE":
        case "Space":
          input.up = false;
          break;
        default:
          return;
      }

      event.preventDefault();
    };

    const clearInput = () => {
      dragging = false;
      renderer.domElement.style.cursor = "grab";
      input.forward = false;
      input.back = false;
      input.left = false;
      input.right = false;
      input.up = false;
      input.down = false;
      input.faster = false;
    };

    const updateMovement = (deltaSeconds: number) => {
      if (!deltaSeconds) {
        return false;
      }

      let moved = false;

      forwardVector.set(0, 0, -1).applyQuaternion(camera.quaternion);
      forwardVector.y = 0;
      if (forwardVector.lengthSq() > 0) {
        forwardVector.normalize();
      }

      rightVector.set(1, 0, 0).applyQuaternion(camera.quaternion);
      rightVector.y = 0;
      if (rightVector.lengthSq() > 0) {
        rightVector.normalize();
      }

      movement.set(0, 0, 0);
      if (input.forward) movement.add(forwardVector);
      if (input.back) movement.addScaledVector(forwardVector, -1);
      if (input.right) movement.add(rightVector);
      if (input.left) movement.addScaledVector(rightVector, -1);
      if (input.up) movement.y += 1;
      if (input.down) movement.y -= 1;
      if (movementJoystickRef.current.y !== 0) {
        movement.addScaledVector(forwardVector, -movementJoystickRef.current.y);
      }
      if (movementJoystickRef.current.x !== 0) {
        movement.addScaledVector(rightVector, movementJoystickRef.current.x);
      }

      if (movement.lengthSq() > 0) {
        tapMoveTarget = null;
        movement.normalize();
        const speed = moveSpeed * (input.faster ? 2.4 : 1);
        const delta = movement.clone().multiplyScalar(speed * deltaSeconds);
        const nextPosition = camera.position.clone().add(delta);
        const resolvedPosition = camera.position.clone();

        nextPosition.copy(camera.position).add(new THREE.Vector3(delta.x, 0, 0));
        if (!collidesWithRoom(camera.position, nextPosition, collisionMeshes)) {
          resolvedPosition.x = nextPosition.x;
        }

        nextPosition.copy(resolvedPosition).add(new THREE.Vector3(0, delta.y, 0));
        if (!collidesWithRoom(resolvedPosition, nextPosition, collisionMeshes)) {
          resolvedPosition.y = nextPosition.y;
        }

        nextPosition.copy(resolvedPosition).add(new THREE.Vector3(0, 0, delta.z));
        if (!collidesWithRoom(resolvedPosition, nextPosition, collisionMeshes)) {
          resolvedPosition.z = nextPosition.z;
        }

        const actualDelta = resolvedPosition.sub(camera.position);
        camera.position.add(actualDelta);
        lookTarget.add(actualDelta);
        camera.lookAt(lookTarget);
        moved = actualDelta.lengthSq() > 0;
        if (moved) {
          setStatus(`cam ${formatVector(camera.position)} | look ${formatVector(lookTarget)}`);
          onViewStateChangeRef.current?.({
            position: {
              x: camera.position.x,
              y: camera.position.y,
              z: camera.position.z,
            },
            target: {
              x: lookTarget.x,
              y: lookTarget.y,
              z: lookTarget.z,
            },
          });
        }
      }

      if (tapMoveTarget) {
        moveTarget.copy(tapMoveTarget).sub(camera.position);
        moveTarget.y = 0;
        const remainingDistance = moveTarget.length();

        if (remainingDistance < 0.08) {
          tapMoveTarget = null;
          return moved;
        }

        moveTarget.normalize();
        const stepDistance = Math.min(
          remainingDistance,
          deltaSeconds * Math.max(moveSpeed * 0.72, 0.55),
        );
        const delta = moveTarget.multiplyScalar(stepDistance);
        const nextPosition = camera.position.clone().add(delta);

        if (!collidesWithRoom(camera.position, nextPosition, collisionMeshes)) {
          camera.position.add(delta);
          lookTarget.add(delta);
          camera.lookAt(lookTarget);
          setStatus(`cam ${formatVector(camera.position)} | look ${formatVector(lookTarget)}`);
          onViewStateChangeRef.current?.({
            position: {
              x: camera.position.x,
              y: camera.position.y,
              z: camera.position.z,
            },
            target: {
              x: lookTarget.x,
              y: lookTarget.y,
              z: lookTarget.z,
            },
          });
          updateCameraMapPosition();
          moved = true;
        } else {
          tapMoveTarget = null;
        }
      }

      return moved;
    };

    const animate = () => {
      if (disposed) {
        return;
      }

      const deltaSeconds = clock.getDelta();
      const needsMovement = updateMovement(deltaSeconds);

      if (needsMovement || renderRequested) {
        renderRequested = false;
        renderFrame();
      }

      requestAnimationFrame(animate);
    };

    const syncPlacementObjects = async () => {
      const placementGroup = placementGroupRef.current;
      const audioListenerInstance = audioListenerRef.current;
      if (!placementGroup || !audioListenerInstance) {
        return;
      }

      for (const audio of positionalAudioRef.current) {
        if (audio.isPlaying) {
          audio.stop();
        }
        audio.disconnect();
      }
      positionalAudioRef.current = [];

      while (placementGroup.children.length > 0) {
        const child = placementGroup.children[0];
        placementGroup.remove(child);
        disposeObject3D(child);
      }

      const scenePlacements: SparkScenePlacement[] =
        placementsRef.current ??
        POSITIONAL_AUDIO_SOURCES.map((source) => ({
          gain: source.volume,
          kind: "audio" as const,
          label: source.name,
          loop: source.loop,
          maxDistance: source.maxDistance,
          position: {
            x: source.worldOffset.x,
            y: source.worldOffset.y,
            z: source.worldOffset.z,
          },
          refDistance: source.refDistance,
          rolloffFactor: source.rolloffFactor,
          selected: false,
          url: source.url,
        }));
      const audioPlacements = scenePlacements.filter(
        (placement): placement is Extract<SparkScenePlacement, { kind: "audio" }> =>
          placement.kind === "audio",
      );
      const tagPlacements = scenePlacements.filter(
        (placement): placement is Extract<SparkScenePlacement, { kind: "tag" }> =>
          placement.kind === "tag",
      );

      const audioLoader = new THREE.AudioLoader();
      const audioEntries = await Promise.all(
        audioPlacements.map(async (source) => {
          const buffer = await audioLoader.loadAsync(source.url);
          return { buffer, source };
        }),
      );

      for (const { buffer, source } of audioEntries) {
        const holder = new THREE.Object3D();
        holder.name = `audio-source-${source.label}`;
        holder.position.set(source.position.x, source.position.y, source.position.z);
        holder.userData = { kind: "audio" };

        const audio = new THREE.PositionalAudio(audioListenerInstance);
        audio.setBuffer(buffer);
        audio.setLoop(source.loop);
        audio.setVolume(source.gain);
        audio.setRefDistance(source.refDistance ?? 0.9);
        audio.setMaxDistance(source.maxDistance ?? 5.8);
        audio.setRolloffFactor(source.rolloffFactor ?? 1.7);
        holder.add(audio);
        holder.add(createPlacementMarker("audio", source.selected === true));
        placementGroup.add(holder);
        positionalAudioRef.current.push(audio);

        if (soundEnabled && !audio.isPlaying) {
          audio.play();
        }
      }

      for (const tag of tagPlacements) {
        const holder = new THREE.Object3D();
        holder.name = `scene-tag-${tag.id ?? tag.title}`;
        holder.position.set(tag.position.x, tag.position.y, tag.position.z);
        holder.userData = { kind: "tag", tag };
        holder.add(createPlacementMarker("tag", tag.selected === true));
        placementGroup.add(holder);
      }

      requestRender();
    };

    const delay = (ms: number) =>
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, ms);
      });

    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clearInput);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", endDrag);
    renderer.domElement.addEventListener("pointercancel", endDrag);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);
    renderer.domElement.addEventListener("dblclick", onDoubleClick);

    void (async () => {
      try {
        loadingPhaseRankRef.current = 0;
        setStatus("Spark で 3sdgs_room.ply を読み込み中...");
        reportLoadingState({
          active: true,
          mode: "progress",
          progress: 0,
          stage: "ダウンロード中",
          detail: "PLY アセットを取得しています",
        });

        const mesh = new SplatMesh({
          url: splatAssetUrl ?? SPARK_ASSET_URL,
          onProgress: (event) => {
            const total = event.total && event.total > 0 ? event.total : event.loaded || 1;
            const ratio = total > 0 ? event.loaded / total : 0;
            const percent = Math.min(100, Math.max(0, ratio * 100));

            reportLoadingState({
              active: true,
              mode: "progress",
              progress: percent,
              stage: "ダウンロード中",
              detail: `PLY アセットを取得しています`,
            });

            if (percent >= 100) {
              reportLoadingState({
                active: true,
                mode: "busy",
                progress: 100,
                stage: "読み込み中",
                detail: "PLY データをメッシュへ変換しています",
              });
            }
          },
        });

        splatMesh = await mesh.initialized;

        if (disposed) {
          splatMesh.dispose();
          return;
        }

        reportLoadingState({
          active: true,
          mode: "busy",
          progress: 100,
          stage: "描画中",
          detail: "シーンと初期カメラを確定しています",
        });

        splatMesh.rotation.copy(SPLAT_MESH_ROTATION);
        splatMesh.updateMatrixWorld(true);
        scene.add(splatMesh);

        const startingView = prepareStartingView(camera, splatMesh);
        const worldBounds = getWorldBoundingBox(splatMesh);
        worldBoundsRef.current = worldBounds;
        camera.position.copy(startingView.position);
        moveSpeed = startingView.moveSpeed;
        lookRadius = Math.max(startingView.radius, 0.1);
        lookTarget.copy(startingView.target);
        orientation.yaw = startingView.yaw;
        orientation.pitch = startingView.pitch;
        setStatus(
          `init cam ${formatVector(startingView.position)} | look ${formatVector(startingView.target)} | bounds y ${formatNumber(worldBounds.min.y)}..${formatNumber(worldBounds.max.y)}`,
        );
        applyOrientation();

        if (disposed) {
          return;
        }

        reportLoadingState({
          active: true,
          mode: "busy",
          progress: 100,
          stage: "衝突判定を準備中",
          detail: "部屋メッシュを読み込んでいます",
        });

        const collisionGltf = await new GLTFLoader().loadAsync(
          collisionAssetUrl ?? COLLISION_ASSET_URL,
        );

        if (disposed) {
          disposeObject3D(collisionGltf.scene);
          return;
        }

        collisionRoom = collisionGltf.scene;
        collisionRoom.rotation.copy(COLLISION_MESH_ROTATION);
        collisionRoom.updateMatrixWorld(true);
        collisionMeshes = collectCollisionMeshes(collisionRoom);
        collisionRoom.visible = showCollisionMeshRef.current;
        collisionRoomRef.current = collisionRoom;
        scene.add(collisionRoom);
        const collisionBounds = getObjectWorldBoundingBox(collisionRoom);
        setMapBounds({
          minX: collisionBounds.min.x,
          maxX: collisionBounds.max.x,
          minZ: collisionBounds.min.z,
          maxZ: collisionBounds.max.z,
        });
        setMapImageDataUrl(renderTopDownMapFromCollisionMeshes(collisionMeshes, collisionBounds));
        const resolvedView = initialViewRef.current
          ? applyInitialViewToCamera(camera, initialViewRef.current)
          : prepareCenteredViewFromBounds(camera, collisionBounds);
        camera.position.copy(resolvedView.position);
        lookTarget.copy(resolvedView.target);
        orientation.yaw = resolvedView.yaw;
        orientation.pitch = resolvedView.pitch;
        const collisionPlacement = initialViewRef.current
          ? {
              ceilingY: collisionBounds.max.y,
              desiredY: resolvedView.position.y,
              floorY: collisionBounds.min.y,
            }
          : alignCameraHeightToCollisionBounds(camera, lookTarget, collisionBounds);
        lookRadius = Math.max(camera.position.distanceTo(lookTarget), 0.1);
        applyOrientation();

        if (disposed) {
          return;
        }

        const placementGroup = new THREE.Group();
        placementGroup.name = "scene-placement-group";
        placementGroupRef.current = placementGroup;
        scene.add(placementGroup);
        await syncPlacementObjects();

        setStatus(
          `init cam ${formatVector(startingView.position)} | splat y ${formatNumber(worldBounds.min.y)}..${formatNumber(worldBounds.max.y)} | collision y ${formatNumber(collisionPlacement.floorY)}..${formatNumber(collisionPlacement.ceilingY)} | cam ${formatVector(camera.position)} | look ${formatVector(lookTarget)} | splats ${splatMesh.context.splats.getNumSplats().toLocaleString()}`,
        );
        reportLoadingState({
          active: true,
          mode: "busy",
          progress: 100,
          stage: "描画中",
          detail: "初回表示を待っています",
        });

        // This warmup is a temporary guard until loading completion is tied to a
        // render-backed signal rather than elapsed time. See
        // docs/spark-initial-render-investigation.md for the async stages we are
        // currently waiting out here.
        for (let pass = 1; pass <= INITIAL_RENDER_WARMUP_PASSES; pass += 1) {
          if (disposed) {
            return;
          }

          requestRender();
          reportLoadingState({
            active: true,
            mode: "busy",
            progress: 100,
            stage: "描画中",
            detail: `初回表示を待っています${".".repeat(pass % 4)}`,
          });
          await delay(INITIAL_RENDER_WARMUP_DELAY_MS);
        }

        if (disposed) {
          return;
        }

        reportLoadingState({
          active: false,
          mode: "busy",
          progress: 100,
          stage: "完了",
          detail: "ビューアの準備が完了しました",
        });
      } catch (error) {
        if (disposed) {
          return;
        }

        const message =
          error instanceof Error ? error.message : "不明なエラーで読み込みに失敗しました";
        setStatus(`読み込み失敗: ${message}`);
        reportLoadingState({
          active: false,
          mode: "busy",
          progress: 100,
          stage: "エラー",
          detail: message,
        });
      }
    })();

    animate();

    return () => {
      disposed = true;
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearInput);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", endDrag);
      renderer.domElement.removeEventListener("pointercancel", endDrag);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      renderer.domElement.removeEventListener("dblclick", onDoubleClick);
      for (const audio of positionalAudioRef.current) {
        if (audio.isPlaying) {
          audio.stop();
        }
        audio.disconnect();
      }
      positionalAudioRef.current = [];
      if (placementGroupRef.current) {
        scene.remove(placementGroupRef.current);
      }
      splatMesh?.dispose();
      if (collisionRoom) {
        disposeObject3D(collisionRoom);
      }
      renderer.dispose();
      worldBoundsRef.current = null;
      cameraRef.current = null;
      audioListenerRef.current = null;
      collisionRoomRef.current = null;
      placementGroupRef.current = null;
      sceneRef.current = null;
      requestRenderRef.current = () => {};
      resetViewerUi();
      reportLoadingState({
        active: false,
        mode: "busy",
        progress: 100,
        stage: "停止",
        detail: "ビューアを終了しました",
      });

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [
    collisionAssetUrl,
    resetViewerUi,
    setCompass,
    setJoystickOffset,
    setMapBounds,
    setMapCameraPosition,
    setMapImageDataUrl,
    setStatus,
    splatAssetUrl,
  ]);

  useEffect(() => {
    let cancelled = false;

    const placementGroup = placementGroupRef.current;
    const audioListener = audioListenerRef.current;
    if (!placementGroup || !audioListener) {
      return;
    }

    const sync = async () => {
      for (const audio of positionalAudioRef.current) {
        if (audio.isPlaying) {
          audio.stop();
        }
        audio.disconnect();
      }
      positionalAudioRef.current = [];

      while (placementGroup.children.length > 0) {
        const child = placementGroup.children[0];
        placementGroup.remove(child);
        disposeObject3D(child);
      }

      const nextPlacements =
        placements ??
        POSITIONAL_AUDIO_SOURCES.map((source) => ({
          gain: source.volume,
          kind: "audio" as const,
          label: source.name,
          loop: source.loop,
          maxDistance: source.maxDistance,
          position: {
            x: source.worldOffset.x,
            y: source.worldOffset.y,
            z: source.worldOffset.z,
          },
          refDistance: source.refDistance,
          rolloffFactor: source.rolloffFactor,
          selected: false,
          url: source.url,
        }));

      const audioLoader = new THREE.AudioLoader();
      const audioEntries = await Promise.all(
        nextPlacements
          .filter(
            (placement): placement is Extract<SparkScenePlacement, { kind: "audio" }> =>
              placement.kind === "audio",
          )
          .map(async (source) => ({
            buffer: await audioLoader.loadAsync(source.url),
            source,
          })),
      );

      if (cancelled) {
        return;
      }

      for (const { buffer, source } of audioEntries) {
        const holder = new THREE.Object3D();
        holder.position.set(source.position.x, source.position.y, source.position.z);
        holder.userData = { kind: "audio" };
        const audio = new THREE.PositionalAudio(audioListener);
        audio.setBuffer(buffer);
        audio.setLoop(source.loop);
        audio.setVolume(source.gain);
        audio.setRefDistance(source.refDistance ?? 0.9);
        audio.setMaxDistance(source.maxDistance ?? 5.8);
        audio.setRolloffFactor(source.rolloffFactor ?? 1.7);
        holder.add(audio);
        holder.add(createPlacementMarker("audio", source.selected === true));
        placementGroup.add(holder);
        positionalAudioRef.current.push(audio);
        if (soundEnabled && !audio.isPlaying) {
          audio.play();
        }
      }

      for (const tag of nextPlacements.filter(
        (placement): placement is Extract<SparkScenePlacement, { kind: "tag" }> =>
          placement.kind === "tag",
      )) {
        const holder = new THREE.Object3D();
        holder.position.set(tag.position.x, tag.position.y, tag.position.z);
        holder.userData = { kind: "tag", tag };
        holder.add(createPlacementMarker("tag", tag.selected === true));
        placementGroup.add(holder);
      }

      requestRenderRef.current();
    };

    void sync();

    return () => {
      cancelled = true;
    };
  }, [placements, soundEnabled]);

  return (
    <div
      ref={containerRef}
      className="relative h-full min-h-0 w-full overflow-hidden rounded-[24px] bg-[#08111e]"
    >
      <ViewerHud
        placements={placementsRef.current ?? []}
        setMovementControl={setMovementControl}
        endMovementControl={endMovementControl}
        setSoundEnabled={(enabled) => {
          onSoundEnabledChange?.(enabled);
        }}
      />
    </div>
  );
}
