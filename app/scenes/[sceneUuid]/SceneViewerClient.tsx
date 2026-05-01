"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import type { ViewerLoadingState } from "@/features/spark-viewer/components/SparkScene";
import { SceneHeader } from "@/features/spark-viewer/components/SceneHeader";
import type {
  SceneInitialView,
  SparkSceneCreatePoint,
  SparkScenePlacement,
  SparkSceneTagSelection,
} from "@/features/spark-viewer/sceneTypes";
import { ScenePopover } from "@/features/spark-viewer/components/ScenePopover";

const SparkScene = dynamic(
  () => import("@/features/spark-viewer/components/SparkScene").then((mod) => mod.SparkScene),
  { ssr: false },
);

type SceneViewerClientProps = {
  canCreatePlacement?: boolean;
  collisionAssetUrl: string | null;
  fullscreen?: boolean;
  initialView?: SceneInitialView | null;
  onCreatePlacementAtPoint?: (position: SparkSceneCreatePoint) => void;
  onSaveInitialView?: () => void;
  onViewStateChange?: (view: SceneInitialView) => void;
  organizationLogoUrl?: string | null;
  placements: SparkScenePlacement[];
  sceneLabel?: string | null;
  sceneSubLabel?: string | null;
  splatAssetUrl: string | null;
};

export function SceneViewerClient({
  canCreatePlacement = false,
  collisionAssetUrl,
  fullscreen = false,
  initialView = null,
  onCreatePlacementAtPoint,
  onSaveInitialView,
  onViewStateChange,
  organizationLogoUrl = null,
  placements,
  sceneLabel = null,
  sceneSubLabel = null,
  splatAssetUrl,
}: SceneViewerClientProps) {
  const [activeTag, setActiveTag] = useState<SparkSceneTagSelection | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [showCollisionMesh, setShowCollisionMesh] = useState(false);
  const [viewerLoading, setViewerLoading] = useState<ViewerLoadingState>({
    active: true,
    mode: "progress",
    progress: 0,
    stage: "ダウンロード中",
    detail: "Scene アセットを取得しています",
  });

  const progress = Math.round(Math.max(0, Math.min(100, viewerLoading.progress)));

  const viewerBody = (
    <>
      <div
        className={`relative overflow-hidden bg-[#020617] ${
          fullscreen ? "h-full w-full" : "rounded-[28px] border border-white/10"
        }`}
      >
        {viewerLoading.active ? (
          <div className="absolute inset-0 z-20 grid place-items-center bg-[#020617]/86 backdrop-blur-md">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-center">
              <div className="text-5xl font-semibold text-white">{progress}%</div>
              <p className="mt-3 text-base text-white">{viewerLoading.stage}</p>
              <p className="mt-2 text-sm text-white/64">{viewerLoading.detail}</p>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-sky-400 transition-[width] duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        ) : null}

        <div className={fullscreen ? "h-full min-h-screen" : "h-[560px]"}>
          <SparkScene
            isSharedView={fullscreen}
            collisionAssetUrl={collisionAssetUrl}
            initialView={initialView}
            onCreatePlacementAtPoint={onCreatePlacementAtPoint}
            onSelectTag={setActiveTag}
            onViewStateChange={onViewStateChange}
            placements={placements}
            reducedControls={fullscreen && !canCreatePlacement}
            soundEnabled={soundEnabled}
            onSoundEnabledChange={setSoundEnabled}
            splatAssetUrl={splatAssetUrl}
            showCollisionMesh={showCollisionMesh}
            onLoadingStateChange={setViewerLoading}
          />
        </div>
      </div>
      {fullscreen ? (
        <>
          <SceneHeader
            className="pointer-events-none absolute left-[max(20px,calc(env(safe-area-inset-left)+20px))] top-[max(20px,calc(env(safe-area-inset-top)+20px))] z-30"
            sceneLabel={sceneLabel}
            organizationName={sceneSubLabel}
            organizationLogoUrl={organizationLogoUrl || "/img/logo.png"}
          />

          {activeTag ? (
            <div className="pointer-events-none absolute right-[max(96px,calc(env(safe-area-inset-right)+96px))] top-1/2 z-30 w-[min(360px,calc(100vw-156px))] max-w-[calc(100vw-156px)] -translate-y-1/2 max-sm:right-[max(20px,calc(env(safe-area-inset-right)+20px))] max-sm:top-auto max-sm:bottom-[max(250px,calc(env(safe-area-inset-bottom)+250px))] max-sm:w-[calc(100vw-40px)] max-sm:max-w-[calc(100vw-40px)] max-sm:translate-y-0">
              <ScenePopover activeTag={activeTag} setActiveTag={setActiveTag} />
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );

  if (fullscreen) {
    return <div className="relative h-full w-full">{viewerBody}</div>;
  }

  return (
    <section className="rounded-[32px] border border-white/10 bg-[#0c1423] p-4 shadow-2xl shadow-black/20">
      {viewerBody}
      <div className="mt-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-white/46">Viewer Controls</p>
          <p className="mt-2 text-sm text-white/68">
            {canCreatePlacement
              ? "編集中は建物をダブルクリックすると、その位置に音声またはタグを追加するポップアップを開けます。"
              : "登録済み PLY と GLB を読み込み、衝突判定用メッシュの表示切り替えだけ先に有効化しています。"}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-3">
          {canCreatePlacement && onSaveInitialView ? (
            <Button onClick={onSaveInitialView} variant="primary">
              現在の視点を初期表示に保存
            </Button>
          ) : null}
          <Button onClick={() => setShowCollisionMesh((current) => !current)} variant="secondary">
            Collision Mesh: {showCollisionMesh ? "ON" : "OFF"}
          </Button>
        </div>
      </div>
    </section>
  );
}
