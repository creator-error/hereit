"use client";

import type { SparkScenePlacement } from "@/features/spark-viewer/sceneTypes";

type SceneMiniMapProps = {
  cameraPosition: {
    x: number;
    z: number;
  } | null;
  mapImageDataUrl: string | null;
  mapBounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  } | null;
  placements: SparkScenePlacement[];
};

function normalize(value: number, min: number, max: number) {
  const span = Math.max(max - min, 0.001);
  return ((value - min) / span) * 100;
}

export function SceneMiniMap({
  cameraPosition,
  mapImageDataUrl,
  mapBounds,
  placements,
}: SceneMiniMapProps) {
  if (!mapBounds) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute bottom-[max(20px,calc(env(safe-area-inset-bottom)+20px))] right-[max(20px,calc(env(safe-area-inset-right)+20px))] z-[3] w-[210px] max-w-[calc(100vw-40px)] rounded-[22px] border border-[rgba(212,175,55,0.38)] bg-[linear-gradient(180deg,rgba(18,24,34,0.92),rgba(10,14,22,0.9))] p-3 text-[rgba(255,255,255,0.92)] shadow-[0_24px_48px_rgba(0,0,0,0.42)] backdrop-blur-[12px]">
      <div className="pointer-events-none absolute inset-0 rounded-[22px] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_35%)]" />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] tracking-[0.2em] text-[#e4c46a]">フロアマップ</p>
          <div className="h-px flex-1 bg-[linear-gradient(90deg,rgba(212,175,55,0.65),rgba(212,175,55,0))]" />
        </div>
        <div className="relative mt-3 aspect-square overflow-hidden rounded-[14px] border border-[rgba(212,175,55,0.3)] bg-[linear-gradient(180deg,rgba(15,23,42,0.95),rgba(8,17,30,0.88))]">
          {mapImageDataUrl ? (
            <img
              src={mapImageDataUrl}
              alt="Scene map"
              className="absolute inset-0 h-full w-full object-cover opacity-92"
            />
          ) : null}
          <div className="absolute inset-2 rounded-[10px] border border-[rgba(255,255,255,0.08)]" />
          {placements.map((placement) => {
            const left = normalize(placement.position.x, mapBounds.minX, mapBounds.maxX);
            const top = normalize(placement.position.z, mapBounds.minZ, mapBounds.maxZ);
            return (
              <div
                key={
                  placement.id ??
                  `${placement.kind}-${placement.position.x}-${placement.position.z}`
                }
                className={`absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                  placement.kind === "audio" ? "bg-[#8ecbff]" : "bg-[#f0d37a]"
                } ${placement.selected ? "ring-2 ring-white/80" : ""}`}
                style={{ left: `${left}%`, top: `${top}%` }}
                title={placement.kind === "audio" ? placement.label : placement.title}
              />
            );
          })}
          {cameraPosition ? (
            <div
              className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#fff7d6] bg-[#f0d37a] shadow-[0_0_0_6px_rgba(212,175,55,0.16),0_0_18px_rgba(240,211,122,0.65)]"
              style={{
                left: `${normalize(cameraPosition.x, mapBounds.minX, mapBounds.maxX)}%`,
                top: `${normalize(cameraPosition.z, mapBounds.minZ, mapBounds.maxZ)}%`,
              }}
            />
          ) : null}
        </div>
        {/* <p className="mt-3 text-center text-[11px] text-white/76">フロアマップ</p> */}
        <p className="mt-1 text-center text-[11px] text-white/54">
          金: 現在位置 / 青: 音声 / 黄: タグ
        </p>
      </div>
    </div>
  );
}
