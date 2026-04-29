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
  alignCameraHeightToCollisionBounds,
  collectCollisionMeshes,
  collidesWithRoom,
  createAudioMarker,
  disposeObject3D,
  getObjectWorldBoundingBox,
  getWorldBoundingBox,
  prepareStartingView,
  toCompassState,
} from "@/features/spark-viewer/sceneHelpers";
import type {
  InputState,
  JoystickVector,
  MovementControlKey,
  OrientationState,
  SparkAudioSource,
  SparkSceneProps,
  ViewerLoadingState,
} from "@/features/spark-viewer/sceneTypes";
import { useViewerUiStore } from "@/features/spark-viewer/stores/viewerUiStore";

export type { ViewerLoadingState } from "@/features/spark-viewer/sceneTypes";

export function SparkScene({
  audioSources,
  collisionAssetUrl = COLLISION_ASSET_URL,
  onLoadingStateChange,
  soundEnabled = false,
  splatAssetUrl = SPARK_ASSET_URL,
  showCollisionMesh = false,
}: SparkSceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const collisionRoomRef = useRef<THREE.Object3D | null>(null);
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
  const setStatus = useViewerUiStore((state) => state.setStatus);
  const resetViewerUi = useViewerUiStore((state) => state.reset);

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
    for (const audio of positionalAudioRef.current) {
      if (soundEnabled) {
        if (!audio.isPlaying && audio.buffer) {
          audio.play();
        }
      } else if (audio.isPlaying) {
        audio.pause();
      }
    }
  }, [soundEnabled]);

  const reportLoadingState = (state: ViewerLoadingState) => {
    const nextRank = state.active ? (state.mode === "progress" ? 1 : 2) : 3;
    const currentRank = loadingPhaseRankRef.current;

    if (nextRank < currentRank) {
      return;
    }

    loadingPhaseRankRef.current = nextRank;
    onLoadingStateChange?.({
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

  const setMovementJoystick = (next: JoystickVector) => {
    movementJoystickRef.current = next;
    setJoystickOffset(next);
    requestRenderRef.current();
  };

  const resetMovementJoystick = () => {
    setMovementJoystick({ x: 0, y: 0 });
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#08111e");

    const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
    cameraRef.current = camera;
    const audioListener = new THREE.AudioListener();
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
    const direction = new THREE.Vector3();
    const lookTarget = new THREE.Vector3();
    const clock = new THREE.Clock();
    const lookSensitivity = 0.0032;
    const formatNumber = (value: number) => value.toFixed(2);
    const formatVector = (vector: THREE.Vector3) =>
      `${formatNumber(vector.x)}, ${formatNumber(vector.y)}, ${formatNumber(vector.z)}`;

    let moveSpeed = 1;
    let lookRadius = 1;
    let dragging = false;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let renderRequested = true;
    let disposed = false;
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
    };

    const onKeyDown = (event: KeyboardEvent) => {
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
        case "ShiftLeft":
        case "ShiftRight":
          input.faster = true;
          break;
        default:
          return;
      }

      event.preventDefault();
      requestRender();
    };

    const onKeyUp = (event: KeyboardEvent) => {
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
        case "ShiftLeft":
        case "ShiftRight":
          input.faster = false;
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
      resetMovementJoystick();
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
        const collisionPlacement = alignCameraHeightToCollisionBounds(
          camera,
          lookTarget,
          collisionBounds,
        );
        lookRadius = Math.max(camera.position.distanceTo(lookTarget), 0.1);

        if (disposed) {
          return;
        }

        const audioLoader = new THREE.AudioLoader();
        const sceneAudioSources: SparkAudioSource[] =
          audioSources ??
          POSITIONAL_AUDIO_SOURCES.map((source) => ({
            gain: source.volume,
            loop: source.loop,
            maxDistance: source.maxDistance,
            name: source.name,
            position: {
              x: source.worldOffset.x,
              y: source.worldOffset.y,
              z: source.worldOffset.z,
            },
            refDistance: source.refDistance,
            rolloffFactor: source.rolloffFactor,
            url: source.url,
          }));
        const audioEntries = await Promise.all(
          sceneAudioSources.map(async (source) => {
            const buffer = await audioLoader.loadAsync(source.url);
            return { buffer, source };
          }),
        );

        if (disposed) {
          return;
        }

        for (const { buffer, source } of audioEntries) {
          const holder = new THREE.Object3D();
          holder.name = `audio-source-${source.name}`;
          holder.position.set(source.position.x, source.position.y, source.position.z);

          const audio = new THREE.PositionalAudio(audioListener);
          audio.setBuffer(buffer);
          audio.setLoop(source.loop);
          audio.setVolume(source.gain);
          audio.setRefDistance(source.refDistance ?? 0.9);
          audio.setMaxDistance(source.maxDistance ?? 5.8);
          audio.setRolloffFactor(source.rolloffFactor ?? 1.7);
          holder.add(audio);
          holder.add(createAudioMarker(source.name));
          scene.add(holder);
          audioObjects.push(holder);
          positionalAudioRef.current.push(audio);

          if (soundEnabled && !audio.isPlaying) {
            audio.play();
          }
        }

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
      for (const audio of positionalAudioRef.current) {
        if (audio.isPlaying) {
          audio.stop();
        }
        audio.disconnect();
      }
      positionalAudioRef.current = [];
      for (const object of audioObjects) {
        scene.remove(object);
      }
      splatMesh?.dispose();
      if (collisionRoom) {
        disposeObject3D(collisionRoom);
      }
      renderer.dispose();
      worldBoundsRef.current = null;
      cameraRef.current = null;
      collisionRoomRef.current = null;
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
  }, [audioSources, collisionAssetUrl, onLoadingStateChange, resetViewerUi, setCompass, setJoystickOffset, setStatus, showCollisionMesh, soundEnabled, splatAssetUrl]);

  return (
    <div
      ref={containerRef}
      className="relative h-full min-h-0 w-full overflow-hidden rounded-[24px] bg-[#08111e]"
    >
      <ViewerHud
        onJoystickPointerDown={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          const radius = bounds.width * 0.5;
          const knobRadius = 26;
          const centerX = bounds.left + bounds.width * 0.5;
          const centerY = bounds.top + bounds.height * 0.5;
          const rawX = event.clientX - centerX;
          const rawY = event.clientY - centerY;
          const maxDistance = Math.max(radius - knobRadius, 1);
          const distance = Math.hypot(rawX, rawY);
          const scale = distance > maxDistance ? maxDistance / distance : 1;
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          setMovementJoystick({
            x: (rawX * scale) / maxDistance,
            y: (rawY * scale) / maxDistance,
          });
        }}
        onJoystickPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
            return;
          }
          const bounds = event.currentTarget.getBoundingClientRect();
          const radius = bounds.width * 0.5;
          const knobRadius = 26;
          const centerX = bounds.left + bounds.width * 0.5;
          const centerY = bounds.top + bounds.height * 0.5;
          const rawX = event.clientX - centerX;
          const rawY = event.clientY - centerY;
          const maxDistance = Math.max(radius - knobRadius, 1);
          const distance = Math.hypot(rawX, rawY);
          const scale = distance > maxDistance ? maxDistance / distance : 1;
          setMovementJoystick({
            x: (rawX * scale) / maxDistance,
            y: (rawY * scale) / maxDistance,
          });
        }}
        onJoystickPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          resetMovementJoystick();
        }}
        onJoystickPointerLeave={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            return;
          }
          resetMovementJoystick();
        }}
        setMovementControl={setMovementControl}
        endMovementControl={endMovementControl}
      />
    </div>
  );
}
