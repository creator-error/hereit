"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { ViewerLoadingState } from "@/features/spark-viewer/components/SparkScene";

const SparkScene = dynamic(
  () =>
    import("@/features/spark-viewer/components/SparkScene").then((mod) => mod.SparkScene),
  { ssr: false },
);

type SceneViewerClientProps = {
  collisionAssetUrl: string | null;
  splatAssetUrl: string | null;
};

export function SceneViewerClient({
  collisionAssetUrl,
  splatAssetUrl,
}: SceneViewerClientProps) {
  const [showCollisionMesh, setShowCollisionMesh] = useState(false);
  const [viewerLoading, setViewerLoading] = useState<ViewerLoadingState>({
    active: true,
    mode: "progress",
    progress: 0,
    stage: "ダウンロード中",
    detail: "Scene アセットを取得しています",
  });

  const progress = Math.round(Math.max(0, Math.min(100, viewerLoading.progress)));

  return (
    <section className="rounded-[32px] border border-white/10 bg-[#0c1423] p-4 shadow-2xl shadow-black/20">
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#020617]">
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

        <div className="h-[560px]">
          <SparkScene
            collisionAssetUrl={collisionAssetUrl}
            splatAssetUrl={splatAssetUrl}
            showCollisionMesh={showCollisionMesh}
            onLoadingStateChange={setViewerLoading}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-white/46">Viewer Controls</p>
          <p className="mt-2 text-sm text-white/68">
            登録済み PLY と GLB を読み込み、衝突判定用メッシュの表示切り替えだけ先に有効化しています。
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCollisionMesh((current) => !current)}
          className="rounded-2xl border border-white/12 bg-white/6 px-4 py-2 text-sm text-white transition hover:bg-white/10"
        >
          Collision Mesh: {showCollisionMesh ? "ON" : "OFF"}
        </button>
      </div>
    </section>
  );
}
