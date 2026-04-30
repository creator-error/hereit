"use client";

import Link from "next/link";
import { useToast } from "@/app/_components/ToastProvider";

type SceneShareControlsProps = {
  sceneId: string;
  shared: boolean;
  compact?: boolean;
};

function getSceneUrl(sceneId: string) {
  return `/scenes/${sceneId}`;
}

export function SceneShareControls({
  sceneId,
  shared,
  compact = false,
}: SceneShareControlsProps) {
  const scenePath = getSceneUrl(sceneId);
  const { showToast } = useToast();

  async function handleCopy() {
    if (!shared) {
      return;
    }

    try {
      const url =
        typeof window === "undefined"
          ? scenePath
          : new URL(scenePath, window.location.origin).toString();
      await navigator.clipboard.writeText(url);
      showToast("共有URLをコピーしました。", "success");
    } catch {
      showToast("共有URLのコピーに失敗しました。", "error");
    }
  }

  return (
    <div className={`flex flex-wrap gap-3 ${compact ? "" : "mt-8"}`}>
      <Link
        href={scenePath}
        className={`rounded-2xl px-4 py-2 text-sm transition ${
          compact
            ? "border border-white/12 bg-white/6 text-white hover:bg-white/10"
            : "bg-[#f59e0b] font-medium text-[#111827] hover:bg-[#fbbf24]"
        }`}
      >
        シーンを開く
      </Link>
      <button
        type="button"
        onClick={handleCopy}
        disabled={!shared}
        className={`rounded-2xl px-4 py-2 text-sm transition ${
          shared
            ? "border border-white/12 bg-white/6 text-white hover:bg-white/10"
            : "cursor-not-allowed border border-white/10 bg-white/[0.03] text-white/36"
        }`}
      >
        {shared ? "共有URLをコピー" : "非公開シーン"}
      </button>
    </div>
  );
}
